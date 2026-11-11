"""Persistence and business rules for the ERP module.

Ported from ``src/storage.js`` but using a JSON file instead of ``localStorage``
so the data survives server restarts. The domain rules are kept identical:
stock balances, cascading deletes, reference integrity, custom field validation
and the document status lifecycle.
"""

from __future__ import annotations

import json
import math
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import FieldDef, ModuleConfig

DEFAULT_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "store.json"

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class ValidationError(Exception):
    def __init__(self, errors: dict[str, str], message: str = "Datos inválidos.") -> None:
        super().__init__(message)
        self.name = "ValidationError"
        self.errors = errors


class NotFoundError(Exception):
    def __init__(self, message: str = "El registro ya no existe.") -> None:
        super().__init__(message)
        self.name = "NotFoundError"
        self.code = "NOT_FOUND"


# --------------------------------------------------------------------------- #
# Low level storage helpers
# --------------------------------------------------------------------------- #
def store_path() -> Path:
    override = os.environ.get("ERP_STORE_PATH")
    return Path(override) if override else DEFAULT_DATA_PATH


def _empty_store() -> dict[str, list[dict[str, Any]]]:
    return {"entities": [], "documents": []}


def _read_store() -> dict[str, list[dict[str, Any]]]:
    path = store_path()
    if not path.exists():
        return _empty_store()
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError:
        return _empty_store()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return _empty_store()
    if not isinstance(parsed, dict):
        return _empty_store()
    entities = parsed.get("entities")
    documents = parsed.get("documents")
    return {
        "entities": entities if isinstance(entities, list) else [],
        "documents": documents if isinstance(documents, list) else [],
    }


def _write_store(data: dict[str, list[dict[str, Any]]]) -> None:
    path = store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def load_entities() -> list[dict[str, Any]]:
    return _read_store()["entities"]


def save_entities(entities: list[dict[str, Any]]) -> None:
    data = _read_store()
    data["entities"] = entities if isinstance(entities, list) else []
    _write_store(data)


def load_documents() -> list[dict[str, Any]]:
    return _read_store()["documents"]


def save_documents(documents: list[dict[str, Any]]) -> None:
    data = _read_store()
    data["documents"] = documents if isinstance(documents, list) else []
    _write_store(data)


def reset_store() -> None:
    path = store_path()
    try:
        path.unlink()
    except FileNotFoundError:
        pass


# --------------------------------------------------------------------------- #
# Generic helpers
# --------------------------------------------------------------------------- #
def generate_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4()}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def trim_string(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _tidy_number(value: float) -> int | float:
    return int(value) if float(value).is_integer() else value


def parse_optional_number(value: Any) -> int | float | None:
    if is_blank(value):
        return None
    try:
        return _tidy_number(float(value))
    except (TypeError, ValueError):
        return math.nan


def parse_quantity(value: Any) -> int | float | None:
    if is_blank(value):
        return None
    try:
        return _tidy_number(float(value))
    except (TypeError, ValueError):
        return math.nan


def is_valid_date(value: Any) -> bool:
    if not isinstance(value, str) or not _DATE_RE.match(value):
        return False
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return False
    return True


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _is_valid_positive_int(value: Any) -> bool:
    return _is_number(value) and float(value).is_integer() and value > 0


def _copy(value: Any) -> Any:
    return json.loads(json.dumps(value))


# --------------------------------------------------------------------------- #
# Custom fields
# --------------------------------------------------------------------------- #
def _coerce_custom_field_value(definition: FieldDef, raw: Any) -> Any:
    if is_blank(raw):
        return ""
    if definition.type == "number":
        try:
            number = float(raw)
        except (TypeError, ValueError):
            return raw
        return int(number) if number.is_integer() else number
    return raw.strip() if isinstance(raw, str) else raw


def _normalize_custom_values(values: Any, definitions: list[FieldDef]) -> dict[str, Any]:
    source = values if isinstance(values, dict) else {}
    result = dict(source)
    for definition in definitions:
        if definition.key in source:
            result[definition.key] = _coerce_custom_field_value(definition, source[definition.key])
    return result


def _validate_custom_fields(
    values: dict[str, Any], definitions: list[FieldDef], prefix: str, errors: dict[str, str]
) -> None:
    for definition in definitions:
        path = f"{prefix}.{definition.key}"
        raw = values.get(definition.key)
        if is_blank(raw):
            if definition.required:
                errors[path] = f'El campo "{definition.label}" es obligatorio.'
            continue
        if definition.type == "number":
            try:
                number = float(raw)
            except (TypeError, ValueError):
                errors[path] = f'El campo "{definition.label}" debe ser numérico.'
                continue
            if not math.isfinite(number):
                errors[path] = f'El campo "{definition.label}" debe ser numérico.'
                continue
            if definition.min is not None and number < definition.min:
                errors[path] = (
                    f'El campo "{definition.label}" debe ser mayor o igual a {definition.min}.'
                )
                continue
            if definition.max is not None and number > definition.max:
                errors[path] = (
                    f'El campo "{definition.label}" debe ser menor o igual a {definition.max}.'
                )
        elif definition.type == "date":
            if not is_valid_date(str(raw)):
                errors[path] = f'El campo "{definition.label}" debe ser una fecha válida.'
        elif definition.type == "select":
            if str(raw) not in definition.options:
                errors[path] = f'El campo "{definition.label}" debe ser una opción válida.'


# --------------------------------------------------------------------------- #
# Entities
# --------------------------------------------------------------------------- #
def normalize_entity_input(input_data: dict[str, Any] | None, config: ModuleConfig) -> dict[str, Any]:
    data = input_data or {}
    definitions = config.custom_fields.get("entity", [])
    normalized: dict[str, Any] = {
        "name": trim_string(data.get("name")),
        "code": trim_string(data.get("code")),
        "category": trim_string(data.get("category")),
        "description": trim_string(data.get("description")),
        "targetDate": trim_string(data.get("targetDate")),
        "unitOfMeasure": trim_string(data.get("unitOfMeasure")),
        "customFields": _normalize_custom_values(data.get("customFields"), definitions),
    }

    reorder_point = parse_optional_number(data.get("reorderPoint"))
    if reorder_point is not None:
        normalized["reorderPoint"] = reorder_point

    unit_cost = parse_optional_number(data.get("unitCost"))
    if unit_cost is not None:
        normalized["unitCost"] = unit_cost

    return normalized


def validate_entity(
    input_data: dict[str, Any],
    config: ModuleConfig,
    entities: list[dict[str, Any]] | None = None,
    exclude_entity_id: str | None = None,
) -> tuple[bool, dict[str, str]]:
    errors: dict[str, str] = {}
    if is_blank(input_data.get("name")):
        errors["name"] = "El nombre es obligatorio."
    if is_blank(input_data.get("code")):
        errors["code"] = "El código es obligatorio."
    if is_blank(input_data.get("category")):
        errors["category"] = "La categoría es obligatoria."
    if not is_blank(input_data.get("targetDate")) and not is_valid_date(
        str(input_data.get("targetDate"))
    ):
        errors["targetDate"] = "La fecha objetivo no es una fecha de calendario válida."

    reorder_point = input_data.get("reorderPoint")
    if reorder_point is not None:
        if not _is_number(reorder_point):
            errors["reorderPoint"] = "El punto de reorden debe ser un número válido."
        elif reorder_point < 0:
            errors["reorderPoint"] = "El punto de reorden debe ser mayor o igual a 0."

    unit_cost = input_data.get("unitCost")
    if unit_cost is not None:
        if not _is_number(unit_cost):
            errors["unitCost"] = "El costo unitario debe ser un número válido."
        elif unit_cost < 0:
            errors["unitCost"] = "El costo unitario debe ser mayor o igual a 0."

    custom_values = input_data.get("customFields")
    if not isinstance(custom_values, dict):
        custom_values = {}
    _validate_custom_fields(custom_values, config.custom_fields.get("entity", []), "customFields", errors)

    code = trim_string(input_data.get("code")).lower()
    if code and entities:
        for entity in entities:
            if exclude_entity_id and entity.get("entity_id") == exclude_entity_id:
                continue
            if trim_string(entity.get("code")).lower() == code:
                errors["code"] = (
                    "Ya existe un registro con ese código. El código debe ser único."
                )
                break

    return len(errors) == 0, errors


def get_entity(entity_id: str) -> dict[str, Any] | None:
    return next((e for e in load_entities() if e.get("entity_id") == entity_id), None)


def add_entity(input_data: dict[str, Any], config: ModuleConfig) -> dict[str, Any]:
    normalized = normalize_entity_input(input_data, config)
    valid, errors = validate_entity(normalized, config, load_entities())
    if not valid:
        raise ValidationError(errors)

    timestamp = now_iso()
    entity = {
        "entity_id": generate_id("ent"),
        **normalized,
        "stockBalance": 0,
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    entities = load_entities()
    entities.append(entity)
    save_entities(entities)
    return _copy(entity)


def update_entity(entity_id: str, updates: dict[str, Any], config: ModuleConfig) -> dict[str, Any]:
    entities = load_entities()
    index = next(
        (i for i, entity in enumerate(entities) if entity.get("entity_id") == entity_id), -1
    )
    if index == -1:
        raise NotFoundError("La entidad ya no existe.")

    existing = entities[index]
    merged = {
        **existing,
        **(updates or {}),
        "customFields": {
            **(existing.get("customFields") or {}),
            **((updates or {}).get("customFields") or {}),
        },
    }
    normalized = normalize_entity_input(merged, config)
    valid, errors = validate_entity(normalized, config, entities, exclude_entity_id=entity_id)
    if not valid:
        raise ValidationError(errors)

    updated = {
        **existing,
        **normalized,
        "entity_id": existing["entity_id"],
        "stockBalance": existing.get("stockBalance", 0),
        "createdAt": existing.get("createdAt"),
        "updatedAt": now_iso(),
    }
    entities[index] = updated
    save_entities(entities)
    return _copy(updated)


def delete_entity(entity_id: str) -> None:
    entities = load_entities()
    remaining = [entity for entity in entities if entity.get("entity_id") != entity_id]
    if len(remaining) == len(entities):
        raise NotFoundError("La entidad ya no existe.")
    save_entities(remaining)
    delete_documents_for_entity(entity_id)


# --------------------------------------------------------------------------- #
# Documents and stock
# --------------------------------------------------------------------------- #
def normalize_document_input(input_data: dict[str, Any] | None, config: ModuleConfig) -> dict[str, Any]:
    data = input_data or {}
    doc_type = trim_string(data.get("type")).upper()
    normalized: dict[str, Any] = {
        "entity_id": trim_string(data.get("entity_id")),
        "type": doc_type,
        "quantity": parse_quantity(data.get("quantity")),
        "notes": trim_string(data.get("notes")),
        "status": trim_string(data.get("status")),
        "customFields": _normalize_custom_values(
            data.get("customFields"), config.custom_fields.get("document", [])
        ),
    }

    if doc_type == "ENTRADA":
        normalized["aisle"] = trim_string(data.get("aisle"))
        normalized["shelf"] = trim_string(data.get("shelf"))
        normalized["level"] = trim_string(data.get("level"))
    else:
        normalized["aisle"] = ""
        normalized["shelf"] = ""
        normalized["level"] = ""

    return normalized


def compute_available_stock(
    entity: dict[str, Any] | None, existing_document: dict[str, Any] | None = None
) -> int | float:
    if not entity:
        return 0
    available = float(entity.get("stockBalance") or 0)
    if existing_document and existing_document.get("entity_id") == entity.get("entity_id"):
        quantity = float(existing_document.get("quantity") or 0)
        if existing_document.get("type") == "ENTRADA":
            available -= quantity
        elif existing_document.get("type") == "SALIDA":
            available += quantity
    return _tidy_number(max(0, available))


def get_available_stock(entity_id: str, existing_document: dict[str, Any] | None = None) -> int | float:
    return compute_available_stock(get_entity(entity_id), existing_document)


def validate_document(
    input_data: dict[str, Any],
    config: ModuleConfig,
    entities: list[dict[str, Any]] | None = None,
    existing_document: dict[str, Any] | None = None,
) -> tuple[bool, dict[str, str]]:
    errors: dict[str, str] = {}
    all_entities = entities if entities is not None else load_entities()
    entity = next(
        (item for item in all_entities if item.get("entity_id") == input_data.get("entity_id")),
        None,
    )

    if is_blank(input_data.get("entity_id")):
        errors["entity_id"] = "Seleccione una entidad."
    elif entity is None:
        errors["entity_id"] = "La entidad seleccionada no existe."

    if input_data.get("type") not in ("ENTRADA", "SALIDA"):
        errors["type"] = "Seleccione un tipo de movimiento válido."

    quantity = input_data.get("quantity")
    if quantity is None:
        errors["quantity"] = "La cantidad es obligatoria."
    elif not _is_valid_positive_int(quantity):
        errors["quantity"] = "La cantidad debe ser un entero mayor que 0."

    if input_data.get("type") == "ENTRADA":
        if is_blank(input_data.get("aisle")):
            errors["aisle"] = "El pasillo es obligatorio para una entrada."
        if is_blank(input_data.get("shelf")):
            errors["shelf"] = "El estante es obligatorio para una entrada."
        if is_blank(input_data.get("level")):
            errors["level"] = "El nivel es obligatorio para una entrada."

    if (
        input_data.get("type") == "SALIDA"
        and entity is not None
        and _is_valid_positive_int(quantity)
    ):
        available = compute_available_stock(entity, existing_document)
        if quantity > available:
            errors["quantity"] = (
                f"Stock insuficiente: disponible {int(available)}, solicitado {int(quantity)}."
            )

    lifecycle = config.status_lifecycle
    if lifecycle:
        states = lifecycle["states"]
        transitions = lifecycle["transitions"]
        status = input_data.get("status")
        if is_blank(status):
            errors["status"] = "Seleccione un estado."
        elif status not in states and not (
            existing_document and status == existing_document.get("status")
        ):
            errors["status"] = "El estado seleccionado no está permitido."
        elif (
            existing_document
            and existing_document.get("status")
            and status != existing_document.get("status")
        ):
            allowed = transitions.get(existing_document.get("status"), [])
            if status not in allowed:
                errors["status"] = (
                    f"Transición no permitida: {existing_document.get('status')} → {status}."
                )

    custom_values = input_data.get("customFields")
    if not isinstance(custom_values, dict):
        custom_values = {}
    _validate_custom_fields(
        custom_values, config.custom_fields.get("document", []), "customFields", errors
    )

    return len(errors) == 0, errors


def get_document(document_id: str) -> dict[str, Any] | None:
    return next((d for d in load_documents() if d.get("document_id") == document_id), None)


def _apply_stock_effect(
    entity: dict[str, Any] | None, document: dict[str, Any], direction: int
) -> None:
    if not entity:
        return
    quantity = float(document.get("quantity") or 0) * direction
    balance = float(entity.get("stockBalance") or 0)
    entity["stockBalance"] = _tidy_number(
        balance + quantity if document.get("type") == "ENTRADA" else balance - quantity
    )


def add_document(input_data: dict[str, Any], config: ModuleConfig) -> dict[str, Any]:
    entities = load_entities()
    normalized = normalize_document_input(input_data, config)
    if config.status_lifecycle and is_blank(normalized.get("status")):
        normalized["status"] = config.status_lifecycle["states"][0]

    valid, errors = validate_document(normalized, config, entities, None)
    if not valid:
        raise ValidationError(errors)

    entity = next(
        (item for item in entities if item.get("entity_id") == normalized["entity_id"]), None
    )
    document = {
        "document_id": generate_id("doc"),
        **normalized,
        "createdAt": now_iso(),
    }

    _apply_stock_effect(entity, document, 1)
    if entity is not None:
        entity["updatedAt"] = now_iso()
    save_entities(entities)

    documents = load_documents()
    documents.append(document)
    save_documents(documents)
    return _copy(document)


def update_document(
    document_id: str, updates: dict[str, Any], config: ModuleConfig
) -> dict[str, Any]:
    documents = load_documents()
    index = next(
        (i for i, document in enumerate(documents) if document.get("document_id") == document_id),
        -1,
    )
    if index == -1:
        raise NotFoundError("El documento ya no existe.")

    existing = documents[index]
    merged = {
        **existing,
        **(updates or {}),
        "customFields": {
            **(existing.get("customFields") or {}),
            **((updates or {}).get("customFields") or {}),
        },
    }

    entities = load_entities()
    normalized = normalize_document_input(merged, config)
    valid, errors = validate_document(normalized, config, entities, existing)
    if not valid:
        raise ValidationError(errors)

    old_entity = next(
        (item for item in entities if item.get("entity_id") == existing.get("entity_id")), None
    )
    if old_entity is not None:
        _apply_stock_effect(old_entity, existing, -1)
        old_entity["updatedAt"] = now_iso()

    new_entity = next(
        (item for item in entities if item.get("entity_id") == normalized.get("entity_id")), None
    )
    if new_entity is None:
        raise ValidationError({"entity_id": "La entidad seleccionada no existe."})

    _apply_stock_effect(new_entity, normalized, 1)
    new_entity["updatedAt"] = now_iso()
    save_entities(entities)

    updated = {
        **existing,
        **normalized,
        "document_id": existing["document_id"],
        "createdAt": existing.get("createdAt"),
    }
    documents[index] = updated
    save_documents(documents)
    return _copy(updated)


def delete_document(document_id: str) -> None:
    documents = load_documents()
    index = next(
        (i for i, document in enumerate(documents) if document.get("document_id") == document_id),
        -1,
    )
    if index == -1:
        raise NotFoundError("El documento ya no existe.")

    document = documents[index]
    entities = load_entities()
    entity = next(
        (item for item in entities if item.get("entity_id") == document.get("entity_id")), None
    )
    if entity is not None:
        _apply_stock_effect(entity, document, -1)
        entity["updatedAt"] = now_iso()
        save_entities(entities)

    documents.pop(index)
    save_documents(documents)


def delete_documents_for_entity(entity_id: str) -> None:
    documents = load_documents()
    remaining = [document for document in documents if document.get("entity_id") != entity_id]
    if len(remaining) != len(documents):
        save_documents(remaining)


# --------------------------------------------------------------------------- #
# Queries and dashboard
# --------------------------------------------------------------------------- #
def get_latest_location(
    entity_id: str, documents: list[dict[str, Any]] | None = None
) -> dict[str, str] | None:
    source = documents if documents is not None else load_documents()
    entries = [
        document
        for document in source
        if document.get("entity_id") == entity_id and document.get("type") == "ENTRADA"
    ]
    if not entries:
        return None

    def sort_key(document: dict[str, Any]) -> str:
        return str(document.get("createdAt") or "")

    latest = max(entries, key=sort_key)
    return {
        "aisle": latest.get("aisle") or "",
        "shelf": latest.get("shelf") or "",
        "level": latest.get("level") or "",
    }


def get_categories(entities: list[dict[str, Any]] | None = None) -> list[str]:
    source = entities if entities is not None else load_entities()
    values = {trim_string(entity.get("category")) for entity in source}
    values.discard("")
    return sorted(values, key=lambda value: value.casefold())


def search_entities(term: str = "", category: str = "") -> list[dict[str, Any]]:
    entities = load_entities()
    normalized_term = term.strip().casefold() if isinstance(term, str) else ""
    category_filter = category.strip().casefold() if isinstance(category, str) else ""

    def matches(entity: dict[str, Any]) -> bool:
        if category_filter and trim_string(entity.get("category")).casefold() != category_filter:
            return False
        if not normalized_term:
            return True
        values = [
            entity.get("name"),
            entity.get("code"),
            entity.get("category"),
            entity.get("description"),
            entity.get("targetDate"),
            entity.get("unitOfMeasure"),
            *(entity.get("customFields") or {}).values(),
        ]
        return any(normalized_term in str(value or "").casefold() for value in values)

    return [entity for entity in entities if matches(entity)]


def get_dashboard_stats(category: str = "") -> dict[str, Any]:
    all_entities = load_entities()
    category_filter = category.strip().casefold() if isinstance(category, str) else ""
    entities = (
        [
            entity
            for entity in all_entities
            if trim_string(entity.get("category")).casefold() == category_filter
        ]
        if category_filter
        else all_entities
    )
    entity_ids = {entity.get("entity_id") for entity in entities}
    documents = load_documents()
    scoped_documents = (
        [document for document in documents if document.get("entity_id") in entity_ids]
        if category_filter
        else documents
    )

    valuation = sum(
        (float(entity.get("stockBalance") or 0)) * (float(entity.get("unitCost") or 0))
        for entity in entities
    )
    critical = sum(
        1
        for entity in entities
        if _is_number(entity.get("reorderPoint"))
        and float(entity.get("stockBalance") or 0) < float(entity.get("reorderPoint"))
    )

    return {
        "total_entities": len(entities),
        "total_documents": len(scoped_documents),
        "valuation": valuation,
        "critical": critical,
        "categories": get_categories(all_entities),
    }
