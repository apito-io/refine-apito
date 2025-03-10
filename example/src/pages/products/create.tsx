import React from 'react';
import { Create, useForm, useSelect } from '@refinedev/antd';
import { Form, Input, InputNumber, Select, Switch } from 'antd';

export const ProductCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm({
    meta: {
      // Specify the fields you want to include in the create mutation
      fields: ['name', 'price', 'description', 'category', 'stock', 'status'],
    },
  });

  // Example of using useSelect for related data
  const { selectProps: categorySelectProps } = useSelect({
    resource: 'categories',
    meta: {
      fields: ['name'],
    },
    optionLabel: 'data.name',
    optionValue: 'id',
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Name"
          name={['data', 'name']}
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Price"
          name={['data', 'price']}
          rules={[{ required: true, message: 'Price is required' }]}
        >
          <InputNumber
            formatter={(value) => `$ ${value}`}
            parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item label="Description" name={['data', 'description']}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item
          label="Category"
          name={['data', 'category']}
          rules={[{ required: true, message: 'Category is required' }]}
        >
          <Select {...categorySelectProps} />
        </Form.Item>
        <Form.Item
          label="Stock"
          name={['data', 'stock']}
          rules={[{ required: true, message: 'Stock is required' }]}
        >
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="Status"
          name={['data', 'status']}
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>
      </Form>
    </Create>
  );
};

export default ProductCreate;
