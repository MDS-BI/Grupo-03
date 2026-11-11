"""Module configuration, ported from ``src/module-config.js``.

The module is configurable: labels, custom fields, document status lifecycle
and the accent color are all derived from a single ``userConfig`` dictionary.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

BASE_FIELD_KEYS = {
    "entity_id",
    "name",
    "code",
    "category",
    "description",
    "targetDate",
    "unitOfMeasure",
    "reorderPoint",
    "unitCost",
    "stockBalance",
    "customFields",
    "createdAt",
    "updatedAt",
    "document_id",
    "type",
    "quantity",
    "aisle",
    "shelf",
    "level",
    "notes",
    "status",
}

NAMED_COLORS = {
    "black",
    "silver",
    "gray",
    "white",
    "maroon",
    "red",
    "purple",
    "fuchsia",
    "green",
    "lime",
    "olive",
    "yellow",
    "navy",
    "blue",
    "teal",
    "aqua",
    "orange",
    "aliceblue",
    "rebeccapurple",
    "transparent",
}

_HEX_RE = re.compile(r"^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$", re.IGNORECASE)
_RGB_RE = re.compile(
    r"^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$",
    re.IGNORECASE,
)
_HSL_RE = re.compile(
    r"^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$",
    re.IGNORECASE,
)

VALID_FIELD_TYPES = {"text", "number", "date", "select"}
VALID_KINDS = ("entity", "document")


@dataclass(frozen=True)
class FieldDef:
    """A dynamic custom field definition."""

    key: str
    label: str
    type: str
    required: bool = False
    min: float | None = None
    max: float | None = None
    options: tuple[str, ...] = ()


@dataclass(frozen=True)
class LabelGroup:
    singular: str
    plural: str
    article: str


@dataclass
class ModuleConfig:
    module_name: str
    labels: dict[str, Any]
    custom_fields: dict[str, list[FieldDef]] = field(
        default_factory=lambda: {"entity": [], "document": []}
    )
    status_lifecycle: dict[str, Any] | None = None
    accent_color: str | None = None

    @property
    def entity(self) -> LabelGroup:
        return self.labels["entity"]

    @property
    def document(self) -> LabelGroup:
        return self.labels["document"]

    def new_label(self, kind: str) -> str:
        group = self.entity if kind == "entity" else self.document
        return "Nueva" if group.article == "la" else "Nuevo"


def is_valid_accent_color(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    color = value.strip()
    if not color:
        return False
    if color.lower() in NAMED_COLORS:
        return True
    return bool(_HEX_RE.match(color) or _RGB_RE.match(color) or _HSL_RE.match(color))


def create_default_config() -> ModuleConfig:
    return ModuleConfig(
        module_name="ERP",
        labels={
            "entity": LabelGroup("Entidad", "Entidades", "la"),
            "document": LabelGroup("Documento", "Documentos", "el"),
            "dashboard": "Panel",
            "search": "Buscar",
            "manage": "Gestión",
        },
        custom_fields={"entity": [], "document": []},
        status_lifecycle=None,
        accent_color=None,
    )


USER_CONFIG: dict[str, Any] = {
    "moduleName": "Logística e Inventario",
    "labels": {
        "entity": {"singular": "Producto", "plural": "Productos", "article": "el"},
        "document": {
            "singular": "Movimiento de Inventario",
            "plural": "Movimientos",
            "article": "el",
        },
        "dashboard": "Panel",
        "search": "Buscar",
        "manage": "Gestión",
    },
    "customFields": {
        "entity": [
            {"key": "sku", "label": "SKU", "type": "text", "required": True},
            {"key": "punto_reorden", "label": "Punto de reorden", "type": "number", "required": True, "min": 0},
            {
                "key": "unidad_medida",
                "label": "Unidad de medida",
                "type": "select",
                "required": False,
                "options": ["Unidades", "Cajas", "Kg", "Litros"],
            },
        ],
        "document": [
            {
                "key": "tipo_movimiento",
                "label": "Tipo de movimiento",
                "type": "select",
                "required": False,
                "options": ["Entrada", "Salida"],
            }
        ],
    },
    "statusLifecycle": {
        "states": ["Borrador", "Pendiente", "Completado", "Cancelado"],
        "transitions": {
            "Borrador": ["Pendiente", "Cancelado"],
            "Pendiente": ["Completado", "Cancelado"],
            "Completado": [],
            "Cancelado": [],
        },
    },
    "theme": {"accentColor": "#1f6feb"},
}


def _read_label(value: Any, path: str, fallback: str, errors: list[str]) -> str:
    if value is None:
        return fallback
    if isinstance(value, str) and value.strip():
        return value.strip()
    errors.append(f'La etiqueta "{path}" debe ser un texto no vacío.')
    return fallback


def _read_label_group(value: Any, path: str, fallback: LabelGroup, errors: list[str]) -> LabelGroup:
    if value is None:
        return fallback
    if not isinstance(value, dict):
        errors.append(f'El grupo de etiquetas "{path}" debe ser un objeto.')
        return fallback
    return LabelGroup(
        singular=_read_label(value.get("singular"), f"{path}.singular", fallback.singular, errors),
        plural=_read_label(value.get("plural"), f"{path}.plural", fallback.plural, errors),
        article=_read_label(value.get("article"), f"{path}.article", fallback.article, errors),
    )


def _normalize_custom_fields(defs: Any, kind: str, errors: list[str]) -> list[FieldDef]:
    if defs is None:
        return []
    if not isinstance(defs, list):
        errors.append(f"customFields.{kind} debe ser un arreglo de definiciones.")
        return []

    seen: set[str] = set()
    valid: list[FieldDef] = []

    for index, definition in enumerate(defs):
        path = f"customFields.{kind}[{index}]"
        if not isinstance(definition, dict):
            errors.append(f"La definición {path} debe ser un objeto.")
            continue

        key = definition.get("key")
        key = key.strip() if isinstance(key, str) else ""
        if not key:
            errors.append(f"La definición {path} requiere una clave no vacía.")
            continue
        if key in BASE_FIELD_KEYS:
            errors.append(f'La clave de campo personalizado "{key}" choca con un campo base y se ignoró.')
            continue
        if key in seen:
            errors.append(f'La clave de campo personalizado "{key}" está duplicada y se ignoró.')
            continue
        seen.add(key)

        label = definition.get("label")
        label = label.strip() if isinstance(label, str) else ""
        if not label:
            errors.append(f'El campo personalizado "{key}" requiere una etiqueta no vacía.')
            continue

        field_type = definition.get("type")
        if field_type not in VALID_FIELD_TYPES:
            errors.append(f'El campo personalizado "{key}" usa un tipo desconocido: "{field_type}".')
            continue

        minimum = definition.get("min") if isinstance(definition.get("min"), (int, float)) else None
        maximum = definition.get("max") if isinstance(definition.get("max"), (int, float)) else None
        options: tuple[str, ...] = ()
        if field_type == "select":
            raw_options = definition.get("options")
            if (
                not isinstance(raw_options, list)
                or not raw_options
                or any(not isinstance(item, str) or not item.strip() for item in raw_options)
            ):
                errors.append(f'El campo personalizado "{key}" requiere opciones no vacías.')
                continue
            options = tuple(item.strip() for item in raw_options)

        valid.append(
            FieldDef(
                key=key,
                label=label,
                type=field_type,
                required=definition.get("required") is True,
                min=minimum,
                max=maximum,
                options=options,
            )
        )

    return valid


def _normalize_status_lifecycle(lifecycle: Any, errors: list[str]) -> dict[str, Any] | None:
    if lifecycle is None:
        return None
    if not isinstance(lifecycle, dict):
        errors.append("statusLifecycle debe ser un objeto o null.")
        return None

    raw_states = lifecycle.get("states")
    if not isinstance(raw_states, list) or not raw_states:
        errors.append("statusLifecycle.states debe ser un arreglo no vacío.")
        return None

    states: list[str] = []
    seen: set[str] = set()
    for state in raw_states:
        if not isinstance(state, str) or not state.strip():
            errors.append("Cada estado del ciclo de vida debe ser un texto no vacío.")
            return None
        value = state.strip()
        if value in seen:
            errors.append(f'El estado "{value}" está duplicado en el ciclo de vida.')
            return None
        seen.add(value)
        states.append(value)

    transitions: dict[str, list[str]] = {state: [] for state in states}
    raw_transitions = lifecycle.get("transitions")
    if raw_transitions is not None:
        if not isinstance(raw_transitions, dict):
            errors.append("statusLifecycle.transitions debe ser un objeto.")
            return None
        for source, targets in raw_transitions.items():
            if source not in seen:
                errors.append(f'La transición parte de un estado no declarado: "{source}".')
                return None
            if not isinstance(targets, list):
                errors.append(f'Las transiciones del estado "{source}" deben ser un arreglo.')
                return None
            next_states: list[str] = []
            for target in targets:
                if not isinstance(target, str) or target.strip() not in seen:
                    errors.append(f'La transición "{source}" apunta a un estado no declarado: "{target}".')
                    return None
                next_states.append(target.strip())
            transitions[source] = list(dict.fromkeys(next_states))

    return {"states": states, "transitions": transitions}


def load_module_config(raw_config: Any = None) -> tuple[ModuleConfig, list[str]]:
    """Validate and normalize the module configuration.

    Returns the effective config plus a list of human readable warnings.
    """

    errors: list[str] = []
    config = create_default_config()

    if raw_config is None:
        return config, errors
    if not isinstance(raw_config, dict):
        errors.append("La configuración del módulo debe ser un objeto.")
        return config, errors

    module_name = raw_config.get("moduleName")
    if module_name is not None:
        if isinstance(module_name, str) and module_name.strip():
            config.module_name = module_name.strip()
        else:
            errors.append("moduleName debe ser un texto no vacío.")

    labels = raw_config.get("labels")
    if labels is not None:
        if not isinstance(labels, dict):
            errors.append("labels debe ser un objeto.")
        else:
            config.labels["entity"] = _read_label_group(
                labels.get("entity"), "labels.entity", config.labels["entity"], errors
            )
            config.labels["document"] = _read_label_group(
                labels.get("document"), "labels.document", config.labels["document"], errors
            )
            config.labels["dashboard"] = _read_label(
                labels.get("dashboard"), "labels.dashboard", config.labels["dashboard"], errors
            )
            config.labels["search"] = _read_label(
                labels.get("search"), "labels.search", config.labels["search"], errors
            )
            config.labels["manage"] = _read_label(
                labels.get("manage"), "labels.manage", config.labels["manage"], errors
            )

    custom_fields = raw_config.get("customFields")
    if custom_fields is not None:
        if not isinstance(custom_fields, dict):
            errors.append("customFields debe ser un objeto con arreglos entity y document.")
        else:
            config.custom_fields["entity"] = _normalize_custom_fields(
                custom_fields.get("entity"), "entity", errors
            )
            config.custom_fields["document"] = _normalize_custom_fields(
                custom_fields.get("document"), "document", errors
            )

    if "statusLifecycle" in raw_config:
        config.status_lifecycle = _normalize_status_lifecycle(raw_config.get("statusLifecycle"), errors)

    theme = raw_config.get("theme")
    if theme is not None:
        if not isinstance(theme, dict):
            errors.append("theme debe ser un objeto.")
        elif "accentColor" in theme:
            accent = theme.get("accentColor")
            if accent in (None, ""):
                config.accent_color = None
            elif is_valid_accent_color(accent):
                config.accent_color = accent.strip()
            else:
                errors.append("El color de acento configurado no es válido; se usará el color base.")

    return config, errors
