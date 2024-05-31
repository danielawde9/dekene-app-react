import React from "react";
import { Card, Table, Button, InputNumber, Form, Popconfirm } from "antd";
import { formatNumber } from "../utils/formatNumber";

const columns = (handleDelete) => [
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
    title: "Action",
    key: "action",
    render: (text, record) => (
      <Popconfirm
        title="Sure to delete?"
        onConfirm={() => handleDelete(record.key)}
      >
        <Button type="link">Delete</Button>
      </Popconfirm>
    ),
  },
];

const Withdrawals = React.memo(({ addWithdrawal, selectedUser, onDelete }) => {
  const [form] = Form.useForm();
  const [withdrawals, setWithdrawals] = React.useState([]);

  const onFinish = (values) => {
    // const newWithdrawal = { ...values, user_id: selectedUser };
    const key = withdrawals.length
      ? withdrawals[withdrawals.length - 1].key + 1
      : 0;
    const newWithdrawal = { ...values, key, user_id: selectedUser };

    setWithdrawals([newWithdrawal]);
    addWithdrawal(newWithdrawal);
    form.resetFields();
  };

  const handleDelete = (key) => {
    const newWithdrawals = withdrawals.filter((item) => item.key !== key);
    setWithdrawals(newWithdrawals);
  };

  return (
    <Card title="Withdrawals">
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
            Add Withdrawal
          </Button>
        </Form.Item>
      </Form>
      <Table
        dataSource={withdrawals}
        columns={columns(handleDelete)}
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

export default Withdrawals;
