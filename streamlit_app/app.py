"""Streamlit interface for the Logística e Inventario ERP module.

Run with:
    streamlit run app.py

The app mirrors the original vanilla-JS module: dashboard with KPIs, master
data management (Products), inventory movements (Inbound/Outbound) and search.
Data is persisted in ``data/store.json`` instead of the browser localStorage.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import streamlit as st

from erp import storage
from erp.config import USER_CONFIG, FieldDef, ModuleConfig, load_module_config

ALL_CATEGORIES = "Todas las categorías"
FALLBACK_UNITS = ["Unidades", "Cajas", "Kg", "Litros"]
TYPE_LABELS = {"ENTRADA": "Entrada", "SALIDA": "Salida"}


# --------------------------------------------------------------------------- #
# Small helpers
# --------------------------------------------------------------------------- #
def _init_state() -> None:
    ss = st.session_state
    if "page" not in ss:
        ss.page = "dashboard"
    if "entity_nonce" not in ss:
        ss.entity_nonce = 0
    if "document_nonce" not in ss:
        ss.document_nonce = 0
    if "dash_category" not in ss:
        ss.dash_category = ALL_CATEGORIES
    if "search_category" not in ss:
        ss.search_category = ALL_CATEGORIES
    if "flash" not in ss:
        ss.flash = None


def _go(page: str) -> None:
    st.session_state.page = page
    st.rerun()


def _open_entity_editor(entity_id: str | None) -> None:
    st.session_state.entity_focus = entity_id
    st.session_state.entity_nonce += 1
    _go("entities")


def _open_document_editor() -> None:
    st.session_state.document_nonce += 1
    _go("documents")


def _set_flash(kind: str, message: str) -> None:
    st.session_state.flash = (kind, message)


def _render_flash() -> None:
    flash = st.session_state.get("flash")
    if not flash:
        return
    kind, message = flash
    st.session_state.flash = None
    renderer = getattr(st, kind, st.info)
    renderer(message)


def _inject_theme(config: ModuleConfig) -> None:
    accent = config.accent_color or "#1f6feb"
    st.markdown(
        f"""
        <style>
        :root {{ --erp-accent: {accent}; }}
        div[data-testid="stMetricValue"] {{ color: var(--erp-accent); }}
        .erp-subtitle {{ color: #6b7280; }}
        </style>
        """,
        unsafe_allow_html=True,
    )


def _initials(module_name: str) -> str:
    words = module_name.split()
    if not words:
        return "ERP"
    if len(words) == 1:
        return words[0][:2].upper()
    return f"{words[0][0]}{words[1][0]}".upper()


def _format_datetime(value: Any) -> str:
    if not value:
        return "—"
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed.strftime("%d-%m-%Y %H:%M")
    except ValueError:
        return str(value)


def _format_date(value: Any) -> str:
    if not value:
        return "—"
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").strftime("%d-%m-%Y")
    except ValueError:
        return str(value)


def _format_currency(value: Any) -> str:
    try:
        return f"${float(value):,.0f}".replace(",", ".")
    except (TypeError, ValueError):
        return "$0"


def _location_text(location: dict[str, str] | None) -> str:
    if not location:
        return "—"
    parts = []
    if location.get("aisle"):
        parts.append(f"Pasillo {location['aisle']}")
    if location.get("shelf"):
        parts.append(f"Estante {location['shelf']}")
    if location.get("level"):
        parts.append(f"Nivel {location['level']}")
    return " · ".join(parts) or "—"


def _document_location(document: dict[str, Any]) -> str:
    return _location_text(
        {
            "aisle": document.get("aisle") or "",
            "shelf": document.get("shelf") or "",
            "level": document.get("level") or "",
        }
    )


def _unit_options(config: ModuleConfig) -> list[str]:
    for definition in config.custom_fields.get("entity", []):
        if definition.key == "unidad_medida" and definition.options:
            return list(definition.options)
    return FALLBACK_UNITS


def _custom_field_input(
    definition: FieldDef, current: Any, key: str, label: str | None = None
) -> Any:
    display_label = label or definition.label
    default = "" if current is None else str(current)
    if definition.type == "select":
        options = [""] + list(definition.options)
        index = options.index(str(current)) if str(current) in options else 0
        return st.selectbox(display_label, options, index=index, key=key)
    if definition.type == "number":
        return st.text_input(
            display_label,
            value=default,
            key=key,
            placeholder="Número",
            help=f"Tipo numérico{f', mínimo {definition.min}' if definition.min is not None else ''}.",
        )
    if definition.type == "date":
        return st.text_input(display_label, value=default, key=key, placeholder="AAAA-MM-DD")
    return st.text_input(display_label, value=default, key=key)


def _entity_row(config: ModuleConfig, entity: dict[str, Any], documents: list[dict[str, Any]]) -> dict[str, Any]:
    row: dict[str, Any] = {
        "Nombre": entity.get("name") or "—",
        "Código": entity.get("code") or "—",
        "Categoría": entity.get("category") or "—",
        "Stock": entity.get("stockBalance", 0),
        "Ubicación reciente": _location_text(
            storage.get_latest_location(entity["entity_id"], documents)
        ),
    }
    for definition in config.custom_fields.get("entity", []):
        value = (entity.get("customFields") or {}).get(definition.key)
        row[definition.label] = "—" if value in (None, "") else value
    unit_cost = entity.get("unitCost")
    if unit_cost in (None, ""):
        row["Valoración"] = None
    else:
        row["Valoración"] = float(entity.get("stockBalance") or 0) * float(unit_cost or 0)
    return row


def _document_row(
    document: dict[str, Any], entity_map: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    entity = entity_map.get(document.get("entity_id"))
    return {
        "Fecha": _format_datetime(document.get("createdAt")),
        "Producto": (entity.get("name") if entity else None) or "—",
        "Tipo": TYPE_LABELS.get(document.get("type"), document.get("type") or "—"),
        "Cantidad": document.get("quantity", 0),
        "Estado": document.get("status") or "—",
        "Ubicación": _document_location(document),
        "Notas": document.get("notes") or "—",
    }


# --------------------------------------------------------------------------- #
# Sidebar
# --------------------------------------------------------------------------- #
def _render_sidebar(config: ModuleConfig, errors: list[str]) -> None:
    with st.sidebar:
        st.markdown(f"## {_initials(config.module_name)} · {config.module_name}")
        st.caption("SCM · Bodegas, existencias y movimientos")

        nav = [
            ("dashboard", config.labels["dashboard"]),
            ("entities", config.entity.plural),
            ("documents", config.document.plural),
            ("search", config.labels["search"]),
        ]
        for key, label in nav:
            active = st.session_state.page == key
            if st.button(
                label,
                key=f"nav_{key}",
                width="stretch",
                type="primary" if active else "secondary",
            ):
                _go(key)

        st.divider()
        if errors:
            st.warning(
                "Configuración del módulo con advertencias:\n\n"
                + "\n".join(f"- {error}" for error in errors)
            )

        with st.expander("Datos y configuración"):
            st.caption(f"Módulo: {config.module_name}")
            st.caption(f"Archivo de datos: {storage.store_path()}")
            confirm = st.checkbox(
                "Confirmo borrar todos los datos", key="confirm_reset_store"
            )
            if st.button(
                "Restablecer datos",
                width="stretch",
                disabled=not confirm,
                key="reset_store",
            ):
                storage.reset_store()
                st.session_state.entity_nonce += 1
                st.session_state.document_nonce += 1
                _set_flash("success", "Datos restablecidos.")
                st.rerun()


# --------------------------------------------------------------------------- #
# Dashboard / Panel
# --------------------------------------------------------------------------- #
def _render_dashboard(config: ModuleConfig) -> None:
    labels = config.labels
    st.header(labels["dashboard"])
    st.caption("Resumen operativo del inventario y accesos rápidos.")

    col1, col2, col3, col4 = st.columns(4)
    if col1.button(
        f"{config.new_label('entity')} {config.entity.singular.lower()}",
        type="primary",
        width="stretch",
        key="qa_new_entity",
    ):
        _open_entity_editor(None)
    if col2.button(
        f"{config.new_label('document')} {config.document.singular.lower()}",
        type="primary",
        width="stretch",
        key="qa_new_document",
    ):
        _open_document_editor()
    if col3.button(
        f"Gestionar {config.entity.plural.lower()}",
        width="stretch",
        key="qa_manage_entities",
    ):
        _open_entity_editor(None)
    if col4.button(
        f"Buscar {config.entity.plural.lower()}",
        width="stretch",
        key="qa_search",
    ):
        _go("search")

    all_entities = storage.load_entities()
    all_documents = storage.load_documents()
    categories = storage.get_categories(all_entities)
    options = [ALL_CATEGORIES] + categories
    if st.session_state.get("dash_category") not in options:
        st.session_state.dash_category = ALL_CATEGORIES

    filter_col, clear_col = st.columns([3, 1])
    selected_category = filter_col.selectbox(
        "Categoría", options, key="dash_category", help="Filtra el panel y el catálogo."
    )
    clear_col.button(
        "Limpiar filtros",
        width="stretch",
        disabled=st.session_state.dash_category == ALL_CATEGORIES,
        on_click=lambda: st.session_state.update(dash_category=ALL_CATEGORIES),
        key="dash_clear",
    )
    category = "" if selected_category == ALL_CATEGORIES else selected_category

    stats = storage.get_dashboard_stats(category)
    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    kpi1.metric(f"Total de {config.entity.plural.lower()}", stats["total_entities"])
    kpi2.metric(f"Total de {config.document.plural.lower()}", stats["total_documents"])
    kpi3.metric("Valoración del stock", _format_currency(stats["valuation"]))
    kpi4.metric("Nivel crítico", stats["critical"])

    if stats["critical"] > 0:
        st.warning(
            f"Hay {stats['critical']} {config.entity.plural.lower()} en nivel crítico de stock."
        )

    if not all_entities and not all_documents:
        st.info(
            f"Aún no hay datos en el panel. Cree {config.entity.article} "
            f"{config.entity.singular.lower()} o registre un "
            f"{config.document.singular.lower()} para comenzar."
        )

    filtered_entities = storage.search_entities("", category)
    st.subheader(f"Catálogo de {config.entity.plural.lower()}")
    st.caption("La valoración se muestra solo en el catálogo y el panel.")
    if filtered_entities:
        rows = [_entity_row(config, entity, all_documents) for entity in filtered_entities]
        st.dataframe(
            rows,
            width="stretch",
            hide_index=True,
            column_config={
                "Valoración": st.column_config.NumberColumn("Valoración", format="$%.0f"),
            },
        )
    else:
        st.info(f"No hay {config.entity.plural.lower()} para los filtros seleccionados.")

    primary_documents = filtered_entities if category else all_entities
    entity_ids = {entity["entity_id"] for entity in primary_documents}
    scoped_documents = [
        document for document in all_documents if document.get("entity_id") in entity_ids
    ]
    sorted_documents = sorted(
        scoped_documents, key=lambda document: str(document.get("createdAt") or ""), reverse=True
    )[:5]
    st.subheader(f"{config.document.plural} recientes")
    if sorted_documents:
        entity_map = {entity["entity_id"]: entity for entity in all_entities}
        st.dataframe(
            [_document_row(document, entity_map) for document in sorted_documents],
            width="stretch",
            hide_index=True,
        )
    else:
        st.info("Todavía no hay movimientos registrados.")

    if filtered_entities:
        with st.expander("Editar o eliminar un producto desde el panel"):
            labels_map = {
                entity["entity_id"]: f"{entity.get('name') or entity.get('code')} — {entity.get('code') or ''}"
                for entity in filtered_entities
            }
            picked = st.selectbox(
                config.entity.singular,
                list(labels_map.keys()),
                format_func=lambda identifier: labels_map.get(identifier, identifier),
                key="dash_pick_entity",
            )
            edit_col, delete_col = st.columns(2)
            if edit_col.button("Editar", width="stretch", key="dash_edit_entity"):
                _open_entity_editor(picked)
            confirmed = st.checkbox(
                f'Confirmo eliminar "{labels_map.get(picked, picked)}" y sus movimientos',
                key="dash_confirm_delete_entity",
            )
            if delete_col.button(
                "Eliminar",
                width="stretch",
                disabled=not confirmed,
                key="dash_delete_entity",
            ):
                try:
                    storage.delete_entity(picked)
                    _set_flash("success", f"{config.entity.singular} eliminado correctamente.")
                    st.session_state.entity_nonce += 1
                    st.rerun()
                except storage.NotFoundError as error:
                    _set_flash("warning", str(error))
                    st.rerun()


# --------------------------------------------------------------------------- #
# Entities (Products)
# --------------------------------------------------------------------------- #
def _render_entity_form(
    config: ModuleConfig, entity: dict[str, Any] | None
) -> tuple[bool, dict[str, Any]]:
    nonce = st.session_state.entity_nonce
    entity_id = entity.get("entity_id") if entity else None
    prefix = f"ent_{nonce}_{entity_id or 'new'}"
    categories = storage.get_categories()
    units = _unit_options(config)

    with st.form(f"entity_form_{prefix}"):
        st.subheader("Datos del registro")
        name = st.text_input(
            "Nombre",
            value=(entity.get("name") if entity else "") or "",
            key=f"{prefix}_name",
            help=f"Nombre visible de {config.entity.article} {config.entity.singular.lower()}.",
        )
        code = st.text_input(
            "Código",
            value=(entity.get("code") if entity else "") or "",
            key=f"{prefix}_code",
            help="Identificador único de negocio (por ejemplo, SKU).",
        )
        category = st.text_input(
            "Categoría",
            value=(entity.get("category") if entity else "") or "",
            key=f"{prefix}_category",
            help=(
                "Obligatoria. Categorías existentes: "
                + (", ".join(categories) if categories else "ninguna todavía")
            ),
        )
        description = st.text_area(
            "Descripción",
            value=(entity.get("description") if entity else "") or "",
            key=f"{prefix}_description",
        )
        target_date = st.text_input(
            "Fecha objetivo (AAAA-MM-DD)",
            value=(entity.get("targetDate") if entity else "") or "",
            key=f"{prefix}_target_date",
            placeholder="Opcional",
        )

        unit_options = ["Sin especificar"] + units
        current_unit = (entity.get("unitOfMeasure") if entity else "") or ""
        unit_index = unit_options.index(current_unit) if current_unit in unit_options else 0
        unit_of_measure = st.selectbox(
            "Unidad de medida (base)", unit_options, index=unit_index, key=f"{prefix}_unit"
        )

        reorder_value = entity.get("reorderPoint") if entity else None
        reorder_point = st.text_input(
            "Punto de reorden (base)",
            value="" if reorder_value in (None, "") else str(reorder_value),
            key=f"{prefix}_reorder",
            placeholder="Opcional",
            help="Umbral numérico (≥ 0) para marcar stock crítico.",
        )
        unit_cost_value = entity.get("unitCost") if entity else None
        unit_cost = st.text_input(
            "Costo unitario",
            value="" if unit_cost_value in (None, "") else str(unit_cost_value),
            key=f"{prefix}_unit_cost",
            placeholder="Opcional",
            help="Solo se usa para la valoración del catálogo y del panel.",
        )

        st.markdown("**Campos personalizados**")
        custom_values: dict[str, Any] = {}
        for definition in config.custom_fields.get("entity", []):
            current = (entity.get("customFields") or {}).get(definition.key, "") if entity else ""
            label = f"{definition.label} *" if definition.required else definition.label
            custom_values[definition.key] = _custom_field_input(
                definition, current, f"{prefix}_cf_{definition.key}", label
            )

        submitted = st.form_submit_button(
            f"Guardar {config.entity.singular}"
            if entity
            else f"Crear {config.entity.singular}",
            type="primary",
        )

    values = {
        "name": name,
        "code": code,
        "category": category,
        "description": description,
        "targetDate": target_date,
        "unitOfMeasure": "" if unit_of_measure == "Sin especificar" else unit_of_measure,
        "reorderPoint": reorder_point,
        "unitCost": unit_cost,
        "customFields": custom_values,
    }
    return submitted, values


def _render_entities_page(config: ModuleConfig) -> None:
    st.header(f"Gestión de {config.entity.plural.lower()}")
    st.caption(
        "Cree, edite o elimine registros sin mostrar la lista completa en esta pantalla."
    )

    entities = storage.load_entities()
    ids = [""] + [entity["entity_id"] for entity in entities]
    nonce = st.session_state.entity_nonce
    focus = st.session_state.pop("entity_focus", None)
    default_index = ids.index(focus) if focus in ids else 0

    def format_entity(identifier: str) -> str:
        if not identifier:
            return f"{config.new_label('entity')} {config.entity.singular.lower()}"
        found = next((item for item in entities if item["entity_id"] == identifier), None)
        if not found:
            return identifier
        return f"{found.get('name') or found.get('code')} — {found.get('code') or ''}"

    selected = st.selectbox(
        f"{config.entity.singular} a editar",
        ids,
        index=default_index,
        format_func=format_entity,
        key=f"entity_selector_{nonce}",
        help="Deje la primera opción para crear un registro nuevo.",
    )
    entity = next((item for item in entities if item["entity_id"] == selected), None)

    if selected and entity is None:
        st.warning("La entidad seleccionada ya no existe. Se ha restablecido el formulario.")
        st.session_state.entity_nonce += 1
        st.rerun()

    submitted, values = _render_entity_form(config, entity)
    if submitted:
        try:
            if entity:
                storage.update_entity(entity["entity_id"], values, config)
                _set_flash(
                    "success", f"{config.entity.singular} actualizado correctamente."
                )
            else:
                storage.add_entity(values, config)
                _set_flash("success", f"{config.entity.singular} creado correctamente.")
            st.session_state.entity_nonce += 1
            st.rerun()
        except storage.ValidationError as error:
            st.error("No se pudo guardar el registro. Revise los campos indicados:")
            for message in error.errors.values():
                st.error(message)
        except storage.NotFoundError as error:
            st.session_state.entity_nonce += 1
            _set_flash("warning", str(error))
            st.rerun()

    if entity:
        st.divider()
        st.subheader(f"Eliminar {config.entity.singular.lower()}")
        st.caption(
            f"Se eliminarán también todos sus {config.document.plural.lower()} asociados."
        )
        confirmed = st.checkbox(
            f'Confirmo eliminar "{entity.get("name") or entity.get("code")}"',
            key=f"confirm_delete_entity_{entity['entity_id']}_{nonce}",
        )
        if st.button(
            f"Eliminar {config.entity.singular}",
            disabled=not confirmed,
            key=f"delete_entity_{entity['entity_id']}_{nonce}",
        ):
            try:
                storage.delete_entity(entity["entity_id"])
                st.session_state.entity_nonce += 1
                _set_flash(
                    "success", f"{config.entity.singular} eliminado correctamente."
                )
                st.rerun()
            except storage.NotFoundError as error:
                st.session_state.entity_nonce += 1
                _set_flash("warning", str(error))
                st.rerun()


# --------------------------------------------------------------------------- #
# Documents (Inventory movements)
# --------------------------------------------------------------------------- #
def _render_document_form(
    config: ModuleConfig,
    entities: list[dict[str, Any]],
    document: dict[str, Any] | None,
    nonce: int,
) -> tuple[bool, dict[str, Any]]:
    document_id = document.get("document_id") if document else None
    prefix = f"doc_{nonce}_{document_id or 'new'}"
    entity_ids = [""] + [entity["entity_id"] for entity in entities]
    entity_labels = {
        entity["entity_id"]: f"{entity.get('name') or entity.get('code')} — {entity.get('code') or ''}"
        for entity in entities
    }
    default_entity = (document.get("entityId") or document.get("entity_id")) if document else ""
    entity_index = entity_ids.index(default_entity) if default_entity in entity_ids else 0
    lifecycle = config.status_lifecycle

    with st.form(f"document_form_{prefix}"):
        entity_id = st.selectbox(
            config.entity.singular,
            entity_ids,
            index=entity_index,
            format_func=lambda value: "Seleccione…" if not value else entity_labels.get(value, value),
            key=f"{prefix}_entity",
            help="Registro al que pertenece el movimiento.",
        )

        type_options = ["Entrada", "Salida"]
        current_type = "Salida" if document and document.get("type") == "SALIDA" else "Entrada"
        type_label = st.selectbox(
            "Tipo",
            type_options,
            index=type_options.index(current_type),
            key=f"{prefix}_type",
            help="Entrada incrementa el stock; salida lo descuenta.",
        )
        document_type = "ENTRADA" if type_label == "Entrada" else "SALIDA"

        current_quantity = document.get("quantity") if document else 1
        try:
            quantity_default = max(1, int(float(current_quantity)))
        except (TypeError, ValueError):
            quantity_default = 1
        quantity = st.number_input(
            "Cantidad",
            min_value=1,
            step=1,
            value=quantity_default,
            key=f"{prefix}_quantity",
            help="Entero mayor que 0.",
        )

        if lifecycle:
            states = lifecycle["states"]
            existing_status = document.get("status") if document else None
            if existing_status in states:
                allowed = list(
                    dict.fromkeys(
                        [existing_status, *lifecycle["transitions"].get(existing_status, [])]
                    )
                )
            else:
                allowed = list(states)
            status_index = allowed.index(existing_status) if existing_status in allowed else 0
            status = st.selectbox(
                "Estado", allowed, index=status_index, key=f"{prefix}_status"
            )
        else:
            status = st.text_input(
                "Estado",
                value=(document.get("status") if document else "") or "",
                key=f"{prefix}_status",
                help="Texto libre cuando no hay ciclo de vida configurado.",
            )

        st.markdown("**Ubicación física**")
        st.caption("Obligatoria para cada entrada de inventario; se ignora en las salidas.")
        aisle = st.text_input(
            "Pasillo", value=(document.get("aisle") if document else "") or "", key=f"{prefix}_aisle"
        )
        shelf = st.text_input(
            "Estante", value=(document.get("shelf") if document else "") or "", key=f"{prefix}_shelf"
        )
        level = st.text_input(
            "Nivel", value=(document.get("level") if document else "") or "", key=f"{prefix}_level"
        )

        st.markdown("**Campos personalizados**")
        custom_values: dict[str, Any] = {}
        for definition in config.custom_fields.get("document", []):
            current = (document.get("customFields") or {}).get(definition.key, "") if document else ""
            label = f"{definition.label} *" if definition.required else definition.label
            custom_values[definition.key] = _custom_field_input(
                definition, current, f"{prefix}_cf_{definition.key}", label
            )

        notes = st.text_area(
            "Notas", value=(document.get("notes") if document else "") or "", key=f"{prefix}_notes"
        )

        submitted = st.form_submit_button(
            f"Guardar {config.document.singular}"
            if document
            else f"Crear {config.document.singular}",
            type="primary",
        )

    values = {
        "entity_id": entity_id,
        "type": document_type,
        "quantity": quantity,
        "status": status,
        "notes": notes,
        "aisle": aisle,
        "shelf": shelf,
        "level": level,
        "customFields": custom_values,
    }
    return submitted, values


def _render_documents_page(config: ModuleConfig) -> None:
    st.header(f"Gestión de {config.document.plural.lower()}")
    st.caption("Registre entradas y salidas; el stock se actualiza al guardar.")

    entities = storage.load_entities()
    if not entities:
        st.info(
            f"No hay {config.entity.plural.lower()} registrados. "
            f"Cree uno antes de registrar movimientos."
        )
        if st.button(f"Crear {config.entity.singular}", type="primary", key="doc_create_entity"):
            _open_entity_editor(None)
        return

    documents = storage.load_documents()
    ids = [""] + [document["document_id"] for document in documents]
    nonce = st.session_state.document_nonce
    entity_map = {entity["entity_id"]: entity for entity in entities}

    def format_document(identifier: str) -> str:
        if not identifier:
            return f"{config.new_label('document')} {config.document.singular.lower()}"
        found = next((item for item in documents if item["document_id"] == identifier), None)
        if not found:
            return identifier
        entity = entity_map.get(found.get("entity_id"))
        type_name = TYPE_LABELS.get(found.get("type"), found.get("type") or "")
        return (
            f"{_format_datetime(found.get('createdAt'))} — "
            f"{(entity.get('name') if entity else None) or '—'} — "
            f"{type_name} {found.get('quantity')}"
        )

    selected = st.selectbox(
        f"{config.document.singular} a editar",
        ids,
        format_func=format_document,
        key=f"document_selector_{nonce}",
        help="Deje la primera opción para registrar un movimiento nuevo.",
    )
    document = next(
        (item for item in documents if item["document_id"] == selected), None
    )

    if selected and document is None:
        st.warning("El movimiento seleccionado ya no existe. Se ha restablecido el formulario.")
        st.session_state.document_nonce += 1
        st.rerun()

    with st.expander("Consultar stock disponible"):
        stock_rows = [
            {
                "Producto": entity.get("name") or "—",
                "Código": entity.get("code") or "—",
                "Stock disponible": storage.compute_available_stock(entity, document),
            }
            for entity in entities
        ]
        st.dataframe(stock_rows, width="stretch", hide_index=True)

    submitted, values = _render_document_form(config, entities, document, nonce)
    if submitted:
        try:
            if document:
                storage.update_document(document["document_id"], values, config)
                _set_flash(
                    "success", f"{config.document.singular} actualizado correctamente."
                )
            else:
                storage.add_document(values, config)
                _set_flash(
                    "success", f"{config.document.singular} registrado correctamente."
                )
            st.session_state.document_nonce += 1
            st.rerun()
        except storage.ValidationError as error:
            st.error("No se pudo guardar el movimiento. Revise los campos indicados:")
            for message in error.errors.values():
                st.error(message)
        except storage.NotFoundError as error:
            st.session_state.document_nonce += 1
            _set_flash("warning", str(error))
            st.rerun()

    if document:
        st.divider()
        st.subheader(f"Eliminar {config.document.singular.lower()}")
        st.caption("El stock se ajustará automáticamente al eliminar el movimiento.")
        confirmed = st.checkbox(
            "Confirmo eliminar este movimiento",
            key=f"confirm_delete_document_{document['document_id']}_{nonce}",
        )
        if st.button(
            f"Eliminar {config.document.singular}",
            disabled=not confirmed,
            key=f"delete_document_{document['document_id']}_{nonce}",
        ):
            try:
                storage.delete_document(document["document_id"])
                st.session_state.document_nonce += 1
                _set_flash(
                    "success", f"{config.document.singular} eliminado correctamente."
                )
                st.rerun()
            except storage.NotFoundError as error:
                st.session_state.document_nonce += 1
                _set_flash("warning", str(error))
                st.rerun()


# --------------------------------------------------------------------------- #
# Search
# --------------------------------------------------------------------------- #
def _render_search_page(config: ModuleConfig) -> None:
    labels = config.labels
    st.header(labels["search"])
    st.caption(
        f"Encuentre {config.entity.plural.lower()} sin salir del módulo. "
        f"La edición permanece en {labels['manage'].lower()}."
    )

    all_entities = storage.load_entities()
    categories = storage.get_categories(all_entities)
    options = [ALL_CATEGORIES] + categories
    if st.session_state.get("search_category") not in options:
        st.session_state.search_category = ALL_CATEGORIES

    term_col, category_col = st.columns([2, 1])
    term = term_col.text_input(
        "Término de búsqueda",
        key="search_term",
        placeholder=(
            f"Buscar {config.entity.plural.lower()} por nombre, código, categoría, "
            "descripción o fecha objetivo…"
        ),
    )
    selected_category = category_col.selectbox(
        "Categoría", options, key="search_category"
    )
    category = "" if selected_category == ALL_CATEGORIES else selected_category

    matches = storage.search_entities(term, category)
    st.caption(f"{len(matches)} resultado(s).")

    if not matches:
        if not all_entities:
            st.info(
                f"No hay {config.entity.plural.lower()} registrados. "
                f"Cree {config.entity.article} {config.entity.singular.lower()} "
                f"en la pantalla de {labels['manage'].lower()}."
            )
        else:
            st.info(
                "No se encontraron resultados. Pruebe con otro término o limpie el "
                "filtro de categoría."
            )
        return

    documents = storage.load_documents()
    for entity in matches:
        with st.container(border=True):
            st.subheader(entity.get("name") or "—")
            if entity.get("description"):
                st.write(entity["description"])

            cols = st.columns(4)
            cols[0].metric("Código", entity.get("code") or "—")
            cols[1].metric("Categoría", entity.get("category") or "—")
            cols[2].metric("Stock", int(entity.get("stockBalance") or 0))
            cols[3].metric("Fecha objetivo", _format_date(entity.get("targetDate")))

            st.caption(
                "Ubicación reciente: "
                + _location_text(
                    storage.get_latest_location(entity["entity_id"], documents)
                )
            )
            custom_bits = []
            for definition in config.custom_fields.get("entity", []):
                value = (entity.get("customFields") or {}).get(definition.key)
                custom_bits.append(
                    f"{definition.label}: {'—' if value in (None, '') else value}"
                )
            if custom_bits:
                st.caption(" · ".join(custom_bits))

            if st.button(
                "Editar en Gestión",
                key=f"search_edit_{entity['entity_id']}",
                width="content",
            ):
                _open_entity_editor(entity["entity_id"])


# --------------------------------------------------------------------------- #
# Entrypoint
# --------------------------------------------------------------------------- #
def main() -> None:
    config, errors = load_module_config(USER_CONFIG)
    st.set_page_config(
        page_title=f"{config.module_name} · ERP",
        layout="wide",
        initial_sidebar_state="expanded",
    )
    _init_state()
    _inject_theme(config)
    _render_sidebar(config, errors)
    _render_flash()

    page = st.session_state.page
    if page == "entities":
        _render_entities_page(config)
    elif page == "documents":
        _render_documents_page(config)
    elif page == "search":
        _render_search_page(config)
    else:
        _render_dashboard(config)


if __name__ == "__main__":
    main()
