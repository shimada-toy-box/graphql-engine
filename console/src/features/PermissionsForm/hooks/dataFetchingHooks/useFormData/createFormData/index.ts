import { TableColumn } from '@/features/DataSource';

import { Metadata, MetadataTable } from '@/features/hasura-metadata-types';
import { isPermission } from '../../../../utils';

type Operation = 'insert' | 'select' | 'update' | 'delete';

const supportedQueries: Operation[] = ['select'];

export const getAllowedFilterKeys = (
  query: 'insert' | 'select' | 'update' | 'delete'
): ('check' | 'filter')[] => {
  switch (query) {
    case 'insert':
      return ['check'];
    case 'update':
      return ['filter', 'check'];
    default:
      return ['filter'];
  }
};

type GetMetadataTableArgs = {
  dataSourceName: string;
  table: unknown;
  metadata: Metadata;
};

const getMetadataTable = (args: GetMetadataTableArgs) => {
  const { dataSourceName, table, metadata } = args;

  const trackedTables = metadata.metadata?.sources?.find(
    source => source.name === dataSourceName
  )?.tables;

  const selectedTable = trackedTables?.find(
    trackedTable => JSON.stringify(trackedTable.table) === JSON.stringify(table)
  );

  // find selected table
  return {
    table: selectedTable,
    tables: trackedTables,
    // for gdc tables will be an array of strings so this needs updating
    tableNames: trackedTables?.map(each => each.table),
  };
};

const getRoles = (metadataTables?: MetadataTable[]) => {
  // go through all tracked tables
  const res = metadataTables?.reduce<Set<string>>((acc, each) => {
    // go through all permissions
    Object.entries(each).forEach(([key, value]) => {
      const props = { key, value };
      // check object key of metadata is a permission
      if (isPermission(props)) {
        // add each role from each permission to the set
        props.value.forEach(permission => {
          acc.add(permission.role);
        });
      }
    });

    return acc;
  }, new Set());
  return Array.from(res || []);
};

interface Args {
  dataSourceName: string;
  table: unknown;
  metadata: Metadata;
  tableColumns: TableColumn[];
}

export const createFormData = (props: Args) => {
  const { dataSourceName, table, metadata, tableColumns } = props;
  // find the specific metadata table
  const metadataTable = getMetadataTable({
    dataSourceName,
    table,
    metadata,
  });

  const roles = getRoles(metadataTable.tables);

  return {
    roles,
    supportedQueries,
    tableNames: metadataTable.tableNames,
    columns: tableColumns?.map(({ name }) => name),
  };
};
