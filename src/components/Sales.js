import React from "react";
import { Card, Table, Button, InputNumber, Form } from "antd";
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
  }
];

const Sales = React.memo(({ addSale, selectedUser, onDelete }) => {
  const [form] = Form.useForm();
  const [sales, setSales] = React.useState([]);

  const onFinish = (values) => {
    const newSale = { ...values, user_id: selectedUser };
    setSales([newSale]);
    addSale(newSale);
    form.resetFields();
  };

  const handleDelete = () => {
    setSales([]);
    if (onDelete) {
      onDelete([]);
    }
  };

  return (
    <Card title="Sales">
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
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Add Sale
          </Button>
        </Form.Item>
      </Form>
      <Table
        dataSource={sales}
        columns={columns()}
        rowKey="user_id"
        pagination={false}
        onRow={(record, rowIndex) => {
          return {
            onDoubleClick: () => handleDelete(),
          };
        }}
      />
    </Card>
  );
});

export default Sales;
