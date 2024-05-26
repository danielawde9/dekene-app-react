// src/components/Sales.js
import React from 'react';
import { Card, Table, Button, InputNumber, Form, Popconfirm } from 'antd';
import { formatNumber } from '../utils/formatNumber';

const columns = (handleDelete) => [
    {
        title: 'Amount USD',
        dataIndex: 'amount_usd',
        key: 'amount_usd',
        render: (text) => formatNumber(text),
    },
    {
        title: 'Amount LBP',
        dataIndex: 'amount_lbp',
        key: 'amount_lbp',
        render: (text) => formatNumber(text),
    },
    {
        title: 'Action',
        key: 'action',
        render: (text, record) => (
            <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.key)}>
                <Button type="link">Delete</Button>
            </Popconfirm>
        ),
    },
];

function Sales({ addSale }) {
    const [form] = Form.useForm();
    const [sales, setSales] = React.useState([]);

    const onFinish = (values) => {
        const key = sales.length ? sales[sales.length - 1].key + 1 : 0;
        const newSale = { ...values, key };
        setSales([...sales, newSale]);
        addSale(newSale);
        form.resetFields();
    };

    const handleDelete = (key) => {
        const newSales = sales.filter((item) => item.key !== key);
        setSales(newSales);
    };

    return (
        <Card title="Sales">
            <Form form={form} onFinish={onFinish}>
                <Form.Item name="amount_usd" label="Amount USD" rules={[{ required: true, message: 'Please input amount in USD!' }]}>
                    <InputNumber
                        formatter={(value) => formatNumber(value)}
                        parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                        style={{ width: '100%' }}
                    />
                </Form.Item>
                <Form.Item name="amount_lbp" label="Amount LBP" rules={[{ required: true, message: 'Please input amount in LBP!' }]}>
                    <InputNumber
                        formatter={(value) => formatNumber(value)}
                        parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                        style={{ width: '100%' }}
                    />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit">
                        Add Sale
                    </Button>
                </Form.Item>
            </Form>
            <Table dataSource={sales} columns={columns(handleDelete)} rowKey="key" />
        </Card>
    );
}

export default Sales;
