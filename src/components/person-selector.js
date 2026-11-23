import { h, option } from './dom.js';
import { getPersons, savePersons } from '../storage.js';

export function renderPersonSelector(container, { selectedPerson = '', onAdd = () => {} } = {}) {
  let persons = getPersons();
  let current = selectedPerson || persons[0] || 'local';

  const select = h('select', {
    class: 'person-select',
    id: 'local-person',
    'data-testid': 'person-selector',
    'aria-label': 'Persona local de la sesión',
    disabled: true,
    onchange: (event) => {
      event.target.value = current;
    }
  });

  const feedback = h('p', {
    class: 'sr-only',
    'data-testid': 'person-selector-feedback',
    role: 'status',
    'aria-live': 'polite'
  });

  const addButton = h(
    'button',
    {
      type: 'button',
      class: 'button button-small button-ghost',
      'data-testid': 'person-add',
      'aria-label': 'Agregar persona para aprobaciones',
      title: 'Agregar persona para aprobaciones',
      onclick: () => {
        const answer = window.prompt('Etiqueta de la persona local:', '');
        if (answer === null) return;
        try {
          persons = savePersons([...persons, answer]);
          const added = persons.find(
            (person) =>
              person.toLocaleLowerCase('es') === String(answer).trim().toLocaleLowerCase('es')
          );
          refreshOptions();
          feedback.textContent = `Persona local agregada: ${added}`;
          onAdd(added);
        } catch (error) {
          feedback.textContent = error?.message ?? 'No se pudo agregar la persona local.';
        }
      }
    },
    '+'
  );

  const control = h(
    'div',
    { class: 'person-control', 'data-testid': 'person-control' },
    h('label', { class: 'sr-only', for: 'local-person' }, 'Persona local'),
    select,
    addButton,
    feedback
  );

  function refreshOptions() {
    if (!persons.some((person) => person === current)) {
      current = persons[0] || 'local';
    }
    select.replaceChildren(...persons.map((person) => option(person, person, person === current)));
    select.value = current;
  }

  refreshOptions();
  container.append(control);

  return {
    control,
    getPerson: () => current,
    setPerson: (person) => {
      current = person;
      refreshOptions();
    },
    refresh: () => {
      persons = getPersons();
      refreshOptions();
    }
  };
}
