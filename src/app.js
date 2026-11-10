import { loadModuleConfig, userConfig } from './module-config.js';
import { clear, formatDateTime, h, option } from './components/dom.js';
import { applyAccent, mountShell } from './components/shell.js';
import { renderDashboard } from './components/dashboard.js';
import { renderEntityForm } from './components/entity-form.js';
import { renderDocumentForm } from './components/document-form.js';
import { renderSearch } from './components/search-bar.js';
import {
  addDocument,
  addEntity,
  deleteDocument,
  deleteEntity,
  getCategories,
  getDocument,
  getEntity,
  loadDocuments,
  loadEntities,
  updateDocument,
  updateEntity
} from './storage.js';

function parseHash(hash) {
  const value = String(hash ?? '')
    .replace(/^#\/?/, '')
    .trim()
    .toLowerCase();
  if (value === 'search') return { view: 'search', section: 'entities' };
  if (value === 'entities') return { view: 'manage', section: 'entities' };
  if (value === 'documents') return { view: 'manage', section: 'documents' };
  return { view: 'dashboard', section: 'entities' };
}

function routeHash(view, section = 'entities') {
  if (view === 'search') return '#/search';
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
    destroyed: false
  };

  const shell = mountShell(targetRoot, {
    config,
    errors,
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
    if (state.view === 'manage' && view !== 'manage' && !confirmDiscard()) return;

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
      if (state.editingEntityId) {
        updateEntity(state.editingEntityId, values, config);
      } else {
        addEntity(values, config);
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
      state.formApis.entity?.setErrors(
        error?.errors ?? { _form: error?.message ?? 'No se pudo guardar.' }
      );
    }
  }

  function handleEntityCancel({ dirty }) {
    if (dirty && !confirmAction('Hay cambios sin guardar. ¿Desea cancelar la edición?')) return;
    state.editingEntityId = null;
    render();
  }

  function handleEntityDelete(entity) {
    const message = `¿Eliminar ${config.labels.entity.article} ${config.labels.entity.singular.toLowerCase()} "${entity.name}"? Se eliminarán también sus ${config.labels.document.plural.toLowerCase()}.`;
    if (!confirmAction(message)) return;
    try {
      deleteEntity(entity.entity_id);
      if (state.editingEntityId === entity.entity_id) state.editingEntityId = null;
    } catch (error) {
      state.notice = error?.message ?? 'No se pudo eliminar el registro.';
    }
    render();
  }

  function handleDocumentSubmit(values) {
    try {
      if (state.editingDocumentId) {
        updateDocument(state.editingDocumentId, values, config);
      } else {
        addDocument(values, config);
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

  function editEntity(entity) {
    state.editingEntityId = entity.entity_id;
    navigate('manage', { section: 'entities', pendingFocus: 'entity-form' });
  }

  function removeEntity(entity) {
    handleEntityDelete(entity);
  }

  function renderManage(container) {
    clear(container);
    const notice = state.notice;
    state.notice = null;

    const entities = loadEntities();
    const categories = getCategories(entities);
    const documents = loadDocuments();
    const labels = config.labels;

    const editingEntity = state.editingEntityId ? getEntity(state.editingEntityId) : null;
    let missingEntity = false;
    if (state.editingEntityId && !editingEntity) {
      missingEntity = true;
      state.editingEntityId = null;
    }

    const editingDocument = state.editingDocumentId ? getDocument(state.editingDocumentId) : null;
    let missingDocument = false;
    if (state.editingDocumentId && !editingDocument) {
      missingDocument = true;
      state.editingDocumentId = null;
    }

    const entitySelector = h(
      'select',
      {
        id: 'entity-selector',
        'data-testid': 'entity-selector',
        onchange: (event) => {
          state.editingEntityId = event.target.value || null;
          renderManage(container);
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
      onSubmit: handleEntitySubmit,
      onCancel: handleEntityCancel,
      onDelete: handleEntityDelete
    });
    state.formApis.entity = entityFormApi;

    const entityMap = new Map(entities.map((entity) => [entity.entity_id, entity]));
    const documentSelector = h(
      'select',
      {
        id: 'document-selector',
        'data-testid': 'document-selector',
        onchange: (event) => {
          state.editingDocumentId = event.target.value || null;
          renderManage(container);
        }
      },
      option(
        '',
        `${newLabel(labels.document)} ${labels.document.singular.toLowerCase()}`,
        !state.editingDocumentId
      ),
      ...documents.map((document) => {
        const entity = entityMap.get(document.entity_id);
        const type = document.type === 'ENTRADA' ? 'Entrada' : 'Salida';
        return option(
          document.document_id,
          `${formatDateTime(document.createdAt)} — ${entity?.name ?? '—'} — ${type} ${document.quantity}`,
          document.document_id === state.editingDocumentId
        );
      })
    );

    const documentFormContainer = h('div');
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
            'Registre entradas y salidas; el stock se actualiza al guardar.'
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
      documentFormContainer
    );

    const documentFormApi = renderDocumentForm(documentFormContainer, {
      config,
      entities,
      document: editingDocument,
      onSubmit: handleDocumentSubmit,
      onCancel: handleDocumentCancel,
      onDelete: handleDocumentDelete
    });
    state.formApis.document = documentFormApi;

    const manageContent = h(
      'div',
      { class: 'stack' },
      h(
        'div',
        { class: 'page-header' },
        h(
          'div',
          {},
          h('h2', {}, labels.manage),
          h(
            'p',
            { class: 'page-subtitle' },
            'Área de creación, edición y eliminación de registros.'
          )
        )
      ),
      notice ? h('p', { class: 'alert alert-warning', role: 'alert' }, notice) : null,
      h('div', { class: 'manage-grid' }, entityPanel, documentPanel)
    );

    container.append(manageContent);

    if (state.section === 'documents' && typeof documentPanel.scrollIntoView === 'function') {
      documentPanel.scrollIntoView({ block: 'start' });
    }
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
