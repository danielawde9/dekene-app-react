import React from "react";
import { Card, Table, Button, Input, InputNumber, Form, Popconfirm } from "antd";
import { formatNumber } from "../utils/formatNumber";

const columns = (handleDelete, handlePay) => [
  {
    title: "Amount USD",
    dataIndex: "amount_usd",
    key: "amount_usd",
    render: (text) => formatNumber(text),
  },
  {
    title: "Amount LBP",
    dataIndex: "amount_lbp",
    key: "amount_lbp",
    render: (text) => formatNumber(text),
  },
  {
    title: "Person",
    dataIndex: "person",
    key: "person",
  },
  {
    title: "Paid",
    dataIndex: "is_paid",
    key: "is_paid",
    render: (text) => (text ? "Yes" : "No"),
  },
  {
    title: "Action",
    key: "action",
    render: (text, record) => (
      <>
        <Popconfirm
          title="Sure to delete?"
          onConfirm={() => handleDelete(record.key)}
        >
          <Button type="link">Delete</Button>
        </Popconfirm>
        {!record.is_paid && (
          <Button type="link" onClick={() => handlePay(record.key)}>
            Pay
          </Button>
        )}
      </>
    ),
  },
];

const Credits = React.memo(({ addCredit, selectedUser, updateClosingBalance }) => {
  const [form] = Form.useForm();
  const [credits, setCredits] = React.useState([]);

  const onFinish = (values) => {
    const key = credits.length ? credits[credits.length - 1].key + 1 : 0;
    const newCredit = { ...values, key, is_paid: false, user_id: selectedUser };
    setCredits([...credits, newCredit]);
    addCredit(newCredit);
    form.resetFields();
  };

  const handleDelete = (key) => {
    const newCredits = credits.filter((item) => item.key !== key);
    setCredits(newCredits);
  };

  const handlePay = (key) => {
    const updatedCredits = credits.map((credit) =>
      credit.key === key ? { ...credit, is_paid: true } : credit
    );
    setCredits(updatedCredits);
    const paidCredit = credits.find((credit) => credit.key === key);
    updateClosingBalance(paidCredit.amount_usd, paidCredit.amount_lbp);
  };

  return (
    <Card title="Credits">
      <Form form={form} onFinish={onFinish}>
        <Form.Item
          name="amount_usd"
          label="Amount USD"
          rules={[{ required: true, message: "Please input amount in USD!" }]}
        >
          <InputNumber
            formatter={(value) => formatNumber(value)}
            parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Form.Item
          name="amount_lbp"
          label="Amount LBP"
          rules={[{ required: true, message: "Please input amount in LBP!" }]}
        >
          <InputNumber
            formatter={(value) => formatNumber(value)}
            parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Form.Item
          name="person"
          label="Person"
          rules={[{ required: true, message: "Please input the person!" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Add Credit
          </Button>
        </Form.Item>
      </Form>
      <Table
        dataSource={credits}
        columns={columns(handleDelete, handlePay)}
        rowKey="key"
      />
    </Card>
  );
});

export default Credits;
