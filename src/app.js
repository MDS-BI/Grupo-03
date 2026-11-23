import { loadModuleConfig, userConfig } from './module-config.js';
import { clear, formatDateTime, h, option } from './components/dom.js';
import { applyAccent, mountShell } from './components/shell.js';
import { renderDashboard } from './components/dashboard.js';
import { renderPersonSelector } from './components/person-selector.js';
import { renderEntityForm } from './components/entity-form.js';
import { renderDocumentForm } from './components/document-form.js';
import { renderDocumentList } from './components/document-list.js';
import { renderSearch } from './components/search-bar.js';
import { renderAuditLog } from './components/audit-log.js';
import {
  addDocument,
  addEntity,
  addProvider,
  approveCountAdjustment,
  closePhysicalCount,
  createPhysicalCount,
  deleteDocument,
  deleteEntity,
  getCategories,
  getDocument,
  getEntity,
  getKardex,
  getKardexOpeningBalance,
  getPersons,
  loadDocuments,
  loadEntities,
  loadProviders,
  recordBlindCountDetail,
  updateDocument,
  updateEntity,
  voidDocument
} from './storage.js';

function parseHash(hash) {
  const value = String(hash ?? '')
    .replace(/^#\/?/, '')
    .trim()
    .toLowerCase();
  if (value === 'search') return { view: 'search', section: 'entities' };
  if (value === 'entities') return { view: 'manage', section: 'entities' };
  if (value === 'documents') return { view: 'manage', section: 'documents' };
  if (value === 'audit') return { view: 'audit', section: 'audit' };
  return { view: 'dashboard', section: 'entities' };
}

function routeHash(view, section = 'entities') {
  if (view === 'search') return '#/search';
  if (view === 'audit') return '#/audit';
  if (view === 'manage') return section === 'documents' ? '#/documents' : '#/entities';
  return '#/dashboard';
}

function newLabel(labels) {
  return labels.article === 'la' ? 'Nueva' : 'Nuevo';
}

export function initApp({ root, rawConfig = userConfig } = {}) {
  const targetRoot = root ?? document.getElementById('app');
  if (!targetRoot) throw new Error('No se encontró el contenedor raíz de la aplicación.');

  if (window.__erpApp?.destroy) {
    window.__erpApp.destroy();
  }

  const { config, errors } = loadModuleConfig(rawConfig);
  const initialRoute = parseHash(window.location.hash);

  const state = {
    view: initialRoute.view,
    section: initialRoute.section,
    editingEntityId: null,
    editingDocumentId: null,
    pendingFocus: null,
    dashboardCategory: '',
    searchCategory: '',
    notice: null,
    formApis: { entity: null, document: null },
    selectedPerson: getPersons()[0] || 'local',
    approverPerson: '',
    destroyed: false
  };

  const personControlHost = h('div');
  const personSelector = renderPersonSelector(personControlHost, {
    selectedPerson: state.selectedPerson,
    onChange: (person) => {
      state.selectedPerson = person;
      state.approverPerson = '';
      render();
    }
  });

  const shell = mountShell(targetRoot, {
    config,
    errors,
    personControl: personControlHost,
    onNavigate: handleNavigation
  });

  function hasUnsavedChanges() {
    return Object.values(state.formApis).some((api) => api?.isDirty?.());
  }

  function confirmDiscard(message = 'Hay cambios sin guardar. ¿Desea salir sin guardar?') {
    if (!hasUnsavedChanges()) return true;
    try {
      return window.confirm(message);
    } catch {
      return true;
    }
  }

  function confirmAction(message) {
    try {
      return window.confirm(message);
    } catch {
      return true;
    }
  }

  function navigate(view, options = {}) {
    const nextSection = options.section ?? state.section;
    const leavingManage =
      state.view === 'manage' && (view !== 'manage' || nextSection !== state.section);
    if (leavingManage && !confirmDiscard()) return;

    if (options.pendingFocus) state.pendingFocus = options.pendingFocus;

    const hash = routeHash(view, nextSection);
    if (window.location.hash === hash) {
      state.view = view;
      state.section = nextSection;
      render();
    } else {
      window.location.hash = hash;
    }
  }

  function handleNavigation(id) {
    if (id === 'dashboard') {
      navigate('dashboard');
    } else if (id === 'search') {
      navigate('search', { pendingFocus: 'search' });
    } else if (id === 'documents') {
      navigate('manage', { section: 'documents' });
    } else if (id === 'audit') {
      navigate('audit', { section: 'audit' });
    } else {
      navigate('manage', { section: 'entities' });
    }
  }

  function handleQuickAction(action) {
    if (action === 'new-entity') {
      state.editingEntityId = null;
      navigate('manage', { section: 'entities', pendingFocus: 'entity-form' });
    } else if (action === 'new-document') {
      state.editingDocumentId = null;
      navigate('manage', { section: 'documents', pendingFocus: 'document-form' });
    } else if (action === 'manage-entities') {
      navigate('manage', { section: 'entities' });
    } else if (action === 'search') {
      navigate('search', { pendingFocus: 'search' });
    }
  }

  function handleEntitySubmit(values) {
    try {
      const payload = { ...values };
      if (payload.newProvider) {
        const provider = addProvider(payload.newProvider);
        payload.providerId = provider.provider_id;
        payload.provider = provider.razon_social;
      }
      delete payload.newProvider;
      if (state.editingEntityId) {
        updateEntity(state.editingEntityId, payload, config, { actorPerson: state.selectedPerson });
      } else {
        addEntity(payload, config, { actorPerson: state.selectedPerson });
      }
      state.editingEntityId = null;
      state.formApis.entity?.markClean();
      render();
    } catch (error) {
      if (error?.code === 'NOT_FOUND') {
        state.editingEntityId = null;
        state.notice = error.message;
        render();
        return;
      }
      const mapped = { ...(error?.errors ?? {}) };
      if (mapped.rut) {
        mapped.providerRut = mapped.rut;
        delete mapped.rut;
      }
      if (mapped.razon_social) {
        mapped.providerRazonSocial = mapped.razon_social;
        delete mapped.razon_social;
      }
      if (mapped.contacto) {
        mapped.providerContacto = mapped.contacto;
        delete mapped.contacto;
      }
      state.formApis.entity?.setErrors(
        Object.keys(mapped).length > 0 ? mapped : { _form: error?.message ?? 'No se pudo guardar.' }
      );
    }
  }

  function handleEntityCancel({ dirty }) {
    if (dirty && !confirmAction('Hay cambios sin guardar. ¿Desea cancelar la edición?')) return;
    state.editingEntityId = null;
    render();
  }

  function handleEntityDelete(entity) {
    const message = `¿Eliminar ${config.labels.entity.article} ${config.labels.entity.singular.toLowerCase()} "${entity.name}"? Si tiene historial, solo se desactivará para conservarlo; si no lo tiene, se eliminará físicamente.`;
    if (!confirmAction(message)) return;
    try {
      deleteEntity(entity.entity_id, { actorPerson: state.selectedPerson });
      if (state.editingEntityId === entity.entity_id) state.editingEntityId = null;
    } catch (error) {
      state.notice = error?.message ?? 'No se pudo eliminar el registro.';
    }
    render();
  }

  function handleDocumentSubmit(values) {
    try {
      if (state.editingDocumentId) {
        updateDocument(state.editingDocumentId, values, config, {
          actorPerson: state.selectedPerson
        });
      } else {
        addDocument(values, config, { actorPerson: state.selectedPerson });
      }
      state.editingDocumentId = null;
      state.formApis.document?.markClean();
      render();
    } catch (error) {
      if (error?.code === 'NOT_FOUND') {
        state.editingDocumentId = null;
        state.notice = error.message;
        render();
        return;
      }
      state.formApis.document?.setErrors(
        error?.errors ?? { _form: error?.message ?? 'No se pudo guardar el movimiento.' }
      );
    }
  }

  function handleDocumentCancel({ dirty }) {
    if (dirty && !confirmAction('Hay cambios sin guardar. ¿Desea cancelar el movimiento?')) return;
    state.editingDocumentId = null;
    render();
  }

  function handleDocumentDelete(documentRecord) {
    const isImmutable =
      documentRecord.state === 'confirmed' ||
      documentRecord.state === 'voided' ||
      documentRecord.voidsMovementId;
    if (isImmutable) {
      state.notice =
        'Los movimientos confirmados son inmutables. Use anulación con contramovimiento.';
      render();
      return;
    }
    if (
      !confirmAction(
        `¿Eliminar ${config.labels.document.article} ${config.labels.document.singular.toLowerCase()} seleccionado? El stock se ajustará automáticamente.`
      )
    ) {
      return;
    }
    try {
      deleteDocument(documentRecord.document_id);
      if (state.editingDocumentId === documentRecord.document_id) state.editingDocumentId = null;
    } catch (error) {
      state.notice = error?.message ?? 'No se pudo eliminar el movimiento.';
    }
    render();
  }

  function handleDocumentVoid(documentRecord) {
    const reason =
      window.prompt('Motivo de anulación (se generará un contramovimiento):', '') ?? '';
    try {
      voidDocument(documentRecord.document_id, { reason, actorPerson: state.selectedPerson });
      state.notice = 'Movimiento anulado mediante contramovimiento.';
      render();
    } catch (error) {
      state.notice = error?.message ?? 'No se pudo anular el movimiento.';
      render();
    }
  }

  function editEntity(entity) {
    state.editingEntityId = entity.entity_id;
    navigate('manage', { section: 'entities', pendingFocus: 'entity-form' });
  }

  function removeEntity(entity) {
    handleEntityDelete(entity);
  }

  function renderEntityPanel(entities, categories) {
    const labels = config.labels;
    const editingEntity = state.editingEntityId ? getEntity(state.editingEntityId) : null;
    let missingEntity = false;
    if (state.editingEntityId && !editingEntity) {
      missingEntity = true;
      state.editingEntityId = null;
    }

    const entitySelector = h(
      'select',
      {
        id: 'entity-selector',
        'data-testid': 'entity-selector',
        onchange: (event) => {
          state.editingEntityId = event.target.value || null;
          render();
        }
      },
      option(
        '',
        `${newLabel(labels.entity)} ${labels.entity.singular.toLowerCase()}`,
        !state.editingEntityId
      ),
      ...entities.map((entity) =>
        option(
          entity.entity_id,
          `${entity.name || entity.code} — ${entity.code || ''}`,
          entity.entity_id === state.editingEntityId
        )
      )
    );

    const entityFormContainer = h('div');
    const entityPanel = h(
      'section',
      { class: 'panel', 'data-testid': 'entities-panel' },
      h(
        'div',
        { class: 'panel-header' },
        h(
          'div',
          {},
          h('h3', {}, `Gestión de ${labels.entity.plural.toLowerCase()}`),
          h(
            'p',
            { class: 'panel-subtitle' },
            `Cree, edite o elimine ${labels.entity.plural.toLowerCase()} sin mostrar la lista completa en esta pantalla.`
          )
        )
      ),
      h(
        'div',
        { class: 'field' },
        h('label', { for: 'entity-selector' }, `${labels.entity.singular} a editar`),
        entitySelector
      ),
      missingEntity
        ? h(
            'p',
            { class: 'alert alert-warning', 'data-testid': 'stale-entity', role: 'alert' },
            'La entidad seleccionada ya no existe. Se ha restablecido el formulario.'
          )
        : null,
      entityFormContainer
    );

    const entityFormApi = renderEntityForm(entityFormContainer, {
      config,
      entity: editingEntity,
      categories,
      providers: loadProviders(),
      onSubmit: handleEntitySubmit,
      onCancel: handleEntityCancel,
      onDelete: handleEntityDelete
    });
    state.formApis.entity = entityFormApi;

    return entityPanel;
  }

  function renderDocumentPanel(entities, documents) {
    const labels = config.labels;
    const editingDocument = state.editingDocumentId ? getDocument(state.editingDocumentId) : null;
    let missingDocument = false;
    if (state.editingDocumentId && !editingDocument) {
      missingDocument = true;
      state.editingDocumentId = null;
    }

    const entityMap = new Map(entities.map((entity) => [entity.entity_id, entity]));
    const documentSelector = h(
      'select',
      {
        id: 'document-selector',
        'data-testid': 'document-selector',
        onchange: (event) => {
          state.editingDocumentId = event.target.value || null;
          render();
        }
      },
      option(
        '',
        `${newLabel(labels.document)} ${labels.document.singular.toLowerCase()}`,
        !state.editingDocumentId
      ),
      ...documents.map((document) => {
        const entity = entityMap.get(document.entity_id);
        const type =
          document.type === 'ENTRADA'
            ? 'Entrada'
            : document.type === 'SALIDA'
              ? 'Salida'
              : document.type === 'TRANSFERENCIA'
                ? 'Transferencia'
                : 'Ajuste';
        return option(
          document.document_id,
          `${formatDateTime(document.createdAt)} - ${entity?.name ?? '-'} - ${type} ${document.quantity}`,
          document.document_id === state.editingDocumentId
        );
      })
    );

    const documentFormContainer = h('div');

    // Kardex / history section
    const kardexEntitySelect = h(
      'select',
      { 'data-testid': 'kardex-entity' },
      option('', `Seleccione ${labels.entity.singular.toLowerCase()}`, !state.kardexEntityId),
      ...entities.map((e) =>
        option(e.entity_id, `${e.name} (${e.code})`, e.entity_id === state.kardexEntityId)
      )
    );
    const fromDateInput = h('input', {
      type: 'date',
      'data-testid': 'kardex-from',
      value: state.kardexFrom || ''
    });
    const toDateInput = h('input', {
      type: 'date',
      'data-testid': 'kardex-to',
      value: state.kardexTo || ''
    });
    const typeFilter = h(
      'select',
      { 'data-testid': 'kardex-type' },
      option('', 'Todos', !state.kardexType),
      option('ENTRADA', 'Entrada', state.kardexType === 'ENTRADA'),
      option('SALIDA', 'Salida', state.kardexType === 'SALIDA'),
      option('TRANSFERENCIA', 'Transferencia', state.kardexType === 'TRANSFERENCIA'),
      option('AJUSTE', 'Ajuste', state.kardexType === 'AJUSTE')
    );
    const kardexListContainer = h('div', { 'data-testid': 'kardex-list' });

    function refreshKardex() {
      clear(kardexListContainer);
      const entityId = state.kardexEntityId || (editingDocument?.entity_id ?? '');
      if (!entityId) {
        kardexListContainer.append(
          h('p', { class: 'panel-subtitle' }, 'Seleccione una entidad para ver el kardex.')
        );
        return;
      }
      const filters = {
        fromDate: state.kardexFrom || '',
        toDate: state.kardexTo || '',
        type: state.kardexType || ''
      };
      const rows = getKardex(entityId, filters);
      const openingBalance = getKardexOpeningBalance(entityId, filters);
      renderDocumentList(kardexListContainer, {
        config,
        documents: rows,
        entities,
        showActions: true,
        showSaldo: true,
        openingBalance,
        onEdit: (doc) => {
          if (doc.state === 'confirmed' || doc.state === 'voided' || doc.voidsMovementId) {
            state.notice = 'Movimiento confirmado: use anulación para corregir.';
            render();
          } else {
            state.editingDocumentId = doc.document_id;
            render();
          }
        },
        onDelete: handleDocumentDelete,
        onVoid: handleDocumentVoid,
        emptyMessage: 'No hay movimientos para los filtros seleccionados.'
      });
    }

    const applyKardexFilters = () => {
      state.kardexEntityId = kardexEntitySelect.value;
      state.kardexFrom = fromDateInput.value;
      state.kardexTo = toDateInput.value;
      state.kardexType = typeFilter.value;
      refreshKardex();
    };
    [kardexEntitySelect, fromDateInput, toDateInput, typeFilter].forEach((el) =>
      el.addEventListener('change', applyKardexFilters)
    );

    // Counts / adjustments (simple UI flow)
    const defaultApprover =
      getPersons().find(
        (person) => person.toLocaleLowerCase('es') !== state.selectedPerson.toLocaleLowerCase('es')
      ) || 'supervisor';
    const countActorInput = h('input', {
      type: 'text',
      'data-testid': 'count-actor',
      value: state.selectedPerson,
      readOnly: true,
      'aria-label': 'Persona local que realiza el conteo'
    });
    const countIdInput = h('input', {
      type: 'text',
      'data-testid': 'count-id',
      placeholder: 'ID conteo',
      value: state.activeCountId || ''
    });
    const countEntitySelect = h(
      'select',
      { 'data-testid': 'count-entity' },
      option('', 'Entidad a contar', true),
      ...entities.map((e) => option(e.entity_id, `${e.name} (${e.code})`))
    );
    const countQtyInput = h('input', {
      type: 'number',
      min: '0',
      step: '1',
      'data-testid': 'count-qty',
      placeholder: 'Cantidad contada (ciego)'
    });
    const approveActorInput = h('input', {
      type: 'text',
      'data-testid': 'adjust-approver',
      value: state.approverPerson || defaultApprover,
      placeholder: 'Persona que aprueba (distinta)'
    });
    const adjustReasonInput = h('input', {
      type: 'text',
      'data-testid': 'adjust-reason',
      placeholder: 'Motivo del ajuste'
    });
    const countStatus = h(
      'p',
      { class: 'panel-subtitle', 'data-testid': 'count-status' },
      state.activeCountId ? `Conteo activo: ${state.activeCountId}` : 'Sin conteo activo.'
    );

    const createCountBtn = h(
      'button',
      {
        type: 'button',
        class: 'button',
        'data-testid': 'count-create',
        onclick: () => {
          try {
            const count = createPhysicalCount({ actorPerson: state.selectedPerson });
            state.activeCountId = count.count_id;
            state.notice = `Conteo creado: ${count.count_id}`;
            render();
          } catch (e) {
            state.notice = e.message;
            render();
          }
        }
      },
      'Crear conteo'
    );
    const recordCountBtn = h(
      'button',
      {
        type: 'button',
        class: 'button',
        'data-testid': 'count-record',
        onclick: () => {
          try {
            if (!state.activeCountId && !countIdInput.value)
              throw new Error('Indique o cree un conteo.');
            const cid = countIdInput.value || state.activeCountId;
            recordBlindCountDetail(cid, {
              entity_id: countEntitySelect.value,
              countedQuantity: countQtyInput.value
            });
            state.activeCountId = cid;
            state.notice = 'Detalle de conteo ciego registrado.';
            render();
          } catch (e) {
            state.notice = e.message;
            render();
          }
        }
      },
      'Registrar conteo ciego'
    );
    const closeCountBtn = h(
      'button',
      {
        type: 'button',
        class: 'button',
        'data-testid': 'count-close',
        onclick: () => {
          try {
            const cid = countIdInput.value || state.activeCountId;
            const closed = closePhysicalCount(cid);
            state.activeCountId = cid;
            state.notice = `Conteo cerrado. Diferencias calculadas (${(closed.details || []).length} líneas).`;
            render();
          } catch (e) {
            state.notice = e.message;
            render();
          }
        }
      },
      'Cerrar conteo'
    );
    const approveAdjustBtn = h(
      'button',
      {
        type: 'button',
        class: 'button button-primary',
        'data-testid': 'count-approve-adjustment',
        onclick: () => {
          try {
            const cid = countIdInput.value || state.activeCountId;
            const result = approveCountAdjustment(cid, {
              approvedByPerson: approveActorInput.value,
              reason: adjustReasonInput.value
            });
            state.notice = `Ajuste aprobado. Movimientos generados: ${result.adjustments.length}.`;
            render();
          } catch (e) {
            state.notice = e.message;
            render();
          }
        }
      },
      'Aprobar ajuste'
    );

    const countSection = h(
      'section',
      { class: 'panel', 'data-testid': 'count-section' },
      h('div', { class: 'panel-header' }, h('h3', {}, 'Conteo físico y ajustes')),
      countStatus,
      h(
        'div',
        { class: 'form-grid' },
        h('div', { class: 'field' }, h('label', {}, 'Persona que cuenta'), countActorInput),
        h('div', { class: 'field' }, h('label', {}, 'ID conteo'), countIdInput),
        h('div', { class: 'field' }, h('label', {}, 'Entidad'), countEntitySelect),
        h('div', { class: 'field' }, h('label', {}, 'Cantidad contada'), countQtyInput),
        h('div', { class: 'field' }, h('label', {}, 'Persona que aprueba'), approveActorInput),
        h('div', { class: 'field' }, h('label', {}, 'Motivo ajuste'), adjustReasonInput)
      ),
      h(
        'div',
        { class: 'actions' },
        createCountBtn,
        recordCountBtn,
        closeCountBtn,
        approveAdjustBtn
      ),
      h(
        'p',
        { class: 'panel-subtitle' },
        'Conteo ciego: no se muestra la cantidad del sistema durante la captura. La aprobación debe registrarse con una persona local distinta a la del conteo.'
      )
    );

    const kardexPanel = h(
      'section',
      { class: 'panel', 'data-testid': 'kardex-panel' },
      h('div', { class: 'panel-header' }, h('h3', {}, 'Kardex / Historial')),
      h(
        'div',
        { class: 'form-grid' },
        h('div', { class: 'field' }, h('label', {}, 'Entidad'), kardexEntitySelect),
        h('div', { class: 'field' }, h('label', {}, 'Desde'), fromDateInput),
        h('div', { class: 'field' }, h('label', {}, 'Hasta'), toDateInput),
        h('div', { class: 'field' }, h('label', {}, 'Tipo'), typeFilter)
      ),
      kardexListContainer
    );

    const documentPanel = h(
      'section',
      { class: 'panel', 'data-testid': 'documents-panel' },
      h(
        'div',
        { class: 'panel-header' },
        h(
          'div',
          {},
          h('h3', {}, `Gestión de ${labels.document.plural.toLowerCase()}`),
          h(
            'p',
            { class: 'panel-subtitle' },
            'Registre movimientos, consulte kardex y gestione conteos/ajustes. Los confirmados son inmutables y se corrigen por anulación.'
          )
        )
      ),
      h(
        'div',
        { class: 'field' },
        h('label', { for: 'document-selector' }, `${labels.document.singular} a editar`),
        documentSelector
      ),
      missingDocument
        ? h(
            'p',
            { class: 'alert alert-warning', 'data-testid': 'stale-document', role: 'alert' },
            'El movimiento seleccionado ya no existe. Se ha restablecido el formulario.'
          )
        : null,
      documentFormContainer,
      kardexPanel,
      countSection
    );

    if (!state.kardexEntityId && editingDocument?.entity_id)
      state.kardexEntityId = editingDocument.entity_id;

    const documentFormApi = renderDocumentForm(documentFormContainer, {
      config,
      entities,
      providers: loadProviders(),
      document: editingDocument,
      actorPerson: state.selectedPerson,
      onSubmit: handleDocumentSubmit,
      onCancel: handleDocumentCancel,
      onDelete: handleDocumentDelete
    });
    state.formApis.document = documentFormApi;
    refreshKardex();

    return documentPanel;
  }

  function renderManage(container) {
    clear(container);
    const notice = state.notice;
    state.notice = null;

    const entities = loadEntities();
    const documents = loadDocuments();
    const labels = config.labels;
    const isDocuments = state.section === 'documents';

    const activeSectionTitle = isDocuments ? labels.document.plural : labels.entity.plural;
    const activeSectionSubtitle = isDocuments
      ? 'Registre entradas y salidas y consulte el historial de movimientos.'
      : 'Cree, edite o elimine los registros del catálogo maestro.';

    const panel = isDocuments
      ? renderDocumentPanel(entities, documents)
      : renderEntityPanel(entities, getCategories(entities));

    const manageContent = h(
      'div',
      { class: 'stack' },
      h(
        'div',
        { class: 'page-header' },
        h(
          'div',
          {},
          h('h2', {}, `${labels.manage} · ${activeSectionTitle}`),
          h('p', { class: 'page-subtitle' }, activeSectionSubtitle)
        )
      ),
      notice ? h('p', { class: 'alert alert-warning', role: 'alert' }, notice) : null,
      h('div', { class: 'manage-grid' }, panel)
    );

    container.append(manageContent);
  }

  function render() {
    if (state.destroyed) return;
    shell.setActive(state.view, state.section);
    shell.setWarnings(errors);
    applyAccent(targetRoot, config);
    clear(shell.view);
    state.formApis = { entity: null, document: null };

    let searchApi = null;
    if (state.view === 'manage') {
      renderManage(shell.view);
    } else if (state.view === 'audit') {
      renderAuditLog(shell.view, { config });
    } else if (state.view === 'search') {
      searchApi = renderSearch(shell.view, {
        config,
        initialCategory: state.searchCategory,
        focus: state.pendingFocus === 'search',
        onCategoryChange: (category) => {
          state.searchCategory = category;
        }
      });
    } else {
      renderDashboard(shell.view, {
        config,
        initialCategory: state.dashboardCategory,
        actorPerson: state.selectedPerson,
        onQuickAction: handleQuickAction,
        onEditEntity: editEntity,
        onDeleteEntity: removeEntity,
        onCategoryChange: (category) => {
          state.dashboardCategory = category;
        }
      });
    }

    if (state.pendingFocus === 'entity-form') {
      state.formApis.entity?.focusFirst();
    } else if (state.pendingFocus === 'document-form') {
      state.formApis.document?.focusFirst();
    } else if (state.pendingFocus === 'search') {
      searchApi?.focus();
    }
    state.pendingFocus = null;
  }

  function handleHashChange() {
    const route = parseHash(window.location.hash);
    if (state.view === route.view && state.section === route.section) return;
    state.view = route.view;
    state.section = route.section;
    render();
  }

  window.addEventListener('hashchange', handleHashChange);
  render();

  const app = {
    config,
    errors,
    state,
    shell,
    personSelector,
    navigate,
    render,
    destroy() {
      state.destroyed = true;
      window.removeEventListener('hashchange', handleHashChange);
      clear(targetRoot);
      if (window.__erpApp === app) delete window.__erpApp;
    }
  };

  window.__erpApp = app;
  return app;
}
