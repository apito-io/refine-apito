import React from 'react';
import {
  List,
  useTable,
  EditButton,
  ShowButton,
  DeleteButton,
  getDefaultSortOrder,
  FilterDropdown,
  useSelect,
} from '@refinedev/antd';
import { useMany } from '@refinedev/core';
import { SearchOutlined } from '@ant-design/icons';
import { Input, Form, Table, Space, Select } from 'antd';

export const ProductList: React.FC = () => {
  const { tableProps, sorters, filters } = useTable({
    meta: {
      // Specify the fields you want to retrieve from Apito
      fields: ['name', 'price', 'description', 'category', 'stock', 'status'],
    },
  });

  // Example of using useMany to get related data
  const categoryQuery = useMany({
    resource: 'categories',
    ids: tableProps?.dataSource?.map((item) => item?.category) ?? [],
    queryOptions: {
      enabled: !!tableProps?.dataSource,
    },
    meta: {
      fields: ['name'],
    },
  });
  const categoryData = categoryQuery.result?.data;
  const categoryIsLoading = categoryQuery.query?.isLoading;

  // Example of using useSelect for filtering
  const { selectProps: categorySelectProps } = useSelect({
    resource: 'categories',
    meta: {
      fields: ['name'],
    },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="id"
          title="ID"
          sorter
          defaultSortOrder={getDefaultSortOrder('id', sorters)}
        />
        <Table.Column
          dataIndex={['data', 'name']}
          title="Name"
          sorter
          filterDropdown={(props: any) => (
            <FilterDropdown {...props}>
              <Input placeholder="Search Name" />
            </FilterDropdown>
          )}
          filterIcon={<SearchOutlined />}
        />
        <Table.Column
          dataIndex={['data', 'price']}
          title="Price"
          sorter
          render={(value) => `$${value}`}
        />
        <Table.Column
          dataIndex={['data', 'category']}
          title="Category"
          filterDropdown={(props: any) => (
            <FilterDropdown {...props}>
              <Form.Item name="category">
                <Select
                  style={{ minWidth: 200 }}
                  placeholder="Select Category"
                  {...categorySelectProps}
                />
              </Form.Item>
            </FilterDropdown>
          )}
          render={(value: any) => {
            if (categoryIsLoading) {
              return 'Loading...';
            }

            const category = categoryData?.find(
              (item: any) => item.id === value
            );
            return category?.data?.name;
          }}
        />
        <Table.Column dataIndex={['data', 'stock']} title="Stock" sorter />
        <Table.Column
          dataIndex={['data', 'status']}
          title="Status"
          render={(value: any) => (value ? 'Active' : 'Inactive')}
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_: any, record: any) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};

export default ProductList;
