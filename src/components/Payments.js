import React from 'react';
import { Card, Table, Button, Input, InputNumber, Form, Popconfirm, Select } from 'antd';
import { formatNumber } from '../utils/formatNumber';

const { Option } = Select;

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
        title: 'Reference Number',
        dataIndex: 'reference_number',
        key: 'reference_number',
    },
    {
        title: 'Cause',
        dataIndex: 'cause',
        key: 'cause',
    },
    {
        title: 'Deduction Source',
        dataIndex: 'deduction_source',
        key: 'deduction_source',
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

function Payments({ addPayment, selectedUser, onDelete }) {
    const [form] = Form.useForm();
    const [payments, setPayments] = React.useState([]);

    const onFinish = (values) => {
        const key = payments.length ? payments[payments.length - 1].key + 1 : 0;
        const newPayment = { ...values, key, user_id: selectedUser };
        setPayments([...payments, newPayment]);
        addPayment(newPayment);
        form.resetFields();
    };

    const handleDelete = (key) => {
        const newPayments = payments.filter((item) => item.key !== key);
        setPayments(newPayments);
        // Call the parent component's calculateTotals function
        if (onDelete) {
            onDelete(newPayments);
        }
    };
    

    return (
        <Card title="Payments">
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
                <Form.Item name="reference_number" label="Reference Number" rules={[{ required: true, message: 'Please input the reference number!' }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="cause" label="Cause" rules={[{ required: true, message: 'Please input the cause!' }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="deduction_source" label="Deduction Source" rules={[{ required: true, message: 'Please select the deduction source!' }]}>
                    <Select placeholder="Select deduction source">
                        <Option value="current">Current Closing</Option>
                        <Option value="withdrawals">Withdrawals</Option>
                    </Select>
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit">
                        Add Payment
                    </Button>
                </Form.Item>
            </Form>
            <Table dataSource={payments} columns={columns(handleDelete)} rowKey="key" scroll={{x: true} }/>
        </Card>
    );
}

export default Payments;
