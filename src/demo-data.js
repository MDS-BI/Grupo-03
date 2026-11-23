import { userConfig } from './module-config.js';
import {
  addDocument,
  addEntity,
  addProvider,
  getPersons,
  resetStore,
  savePersons
} from './storage.js';

export function loadDemoData() {
  const persons = getPersons();
  const actor = persons[0] || 'Ana';
  resetStore();
  savePersons(persons);

  const provider = addProvider({
    rut: '12.345.678-5',
    razon_social: 'Distribuidora Andina',
    contacto: 'Ana Ruiz'
  });

  const tornillos = addEntity(
    {
      name: 'Tornillos M6',
      code: 'TOR-M6',
      category: 'Ferretería',
      unitCost: 1200,
      reorderPoint: 30,
      providerId: provider.provider_id,
      customFields: {
        sku: 'TOR-M6',
        punto_reorden: 30,
        unidad_medida: 'Cajas'
      }
    },
    userConfig,
    { actorPerson: actor }
  );

  const cinta = addEntity(
    {
      name: 'Cinta de embalaje',
      code: 'CIN-48',
      category: 'Oficina',
      unitCost: 450,
      reorderPoint: 10,
      providerId: provider.provider_id,
      customFields: {
        sku: 'CIN-48',
        punto_reorden: 10,
        unidad_medida: 'Unidades'
      }
    },
    userConfig,
    { actorPerson: actor }
  );

  addDocument(
    {
      entity_id: tornillos.entity_id,
      type: 'ENTRADA',
      quantity: 80,
      aisle: 'A',
      shelf: '1',
      level: '2',
      doc_respaldo: 'OC-1001',
      providerId: provider.provider_id,
      state: 'confirmed'
    },
    userConfig,
    { actorPerson: actor }
  );
  addDocument(
    {
      entity_id: tornillos.entity_id,
      type: 'SALIDA',
      quantity: 25,
      reason: 'Venta',
      state: 'confirmed'
    },
    userConfig,
    { actorPerson: actor }
  );
  addDocument(
    {
      entity_id: tornillos.entity_id,
      type: 'TRANSFERENCIA',
      quantity: 10,
      fromAisle: 'A',
      fromShelf: '1',
      fromLevel: '2',
      toAisle: 'B',
      toShelf: '2',
      toLevel: '1',
      state: 'confirmed'
    },
    userConfig,
    { actorPerson: actor }
  );
  addDocument(
    {
      entity_id: cinta.entity_id,
      type: 'ENTRADA',
      quantity: 6,
      aisle: 'C',
      shelf: '1',
      level: '1',
      doc_respaldo: 'OC-1002',
      providerId: provider.provider_id,
      state: 'confirmed'
    },
    userConfig,
    { actorPerson: actor }
  );

  return { provider, tornillos, cinta };
}
