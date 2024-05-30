import React from "react";
import {
  Card,
  Table,
  Button,
  Input,
  InputNumber,
  Form,
  Popconfirm,
} from "antd";
import { formatNumber } from "../utils/formatNumber";

const columns = () => [
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
];

const Credits = React.memo(({ addCredit, selectedUser }) => {
  const [form] = Form.useForm();
  const [credits, setCredits] = React.useState([]);

  const onFinish = (values) => {
    const key = credits.length ? credits[credits.length - 1].key + 1 : 0;
    const newCredit = { ...values, key, user_id: selectedUser };
    setCredits([...credits, newCredit]);
    addCredit(newCredit);
    form.resetFields();
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
      <Table dataSource={credits} columns={columns()} rowKey="key" />
    </Card>
  );
});

export default Credits;
