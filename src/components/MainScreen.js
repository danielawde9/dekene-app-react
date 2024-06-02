import React, { useState, useEffect, useCallback } from "react";
import {
  Layout,
  Row,
  Col,
  Button,
  Select,
  Form,
  Modal,
  Switch,
  DatePicker,
  Tabs,
  Alert,
  Divider,
  Typography,
  Card,
  Table,
  InputNumber,
  Popconfirm,
  Input,
} from "antd";
import { createClient } from "@supabase/supabase-js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const { Content, Footer } = Layout;
const { Option } = Select;

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_EXCHANGE_RATE = 90000;

const formatNumber = (value) => new Intl.NumberFormat().format(value);

const MainScreen = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openingBalances, setOpeningBalances] = useState({ usd: 0, lbp: 0 });
  const [closingBalances, setClosingBalances] = useState({ usd: 0, lbp: 0 });
  const [credits, setCredits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sales, setSales] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [totals, setTotals] = useState({ usd: 0, lbp: 0 });
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [manualDateEnabled, setManualDateEnabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    // Fetch data on mount
    const fetchData = async () => {
      // Fetch opening balances
      const { data: balanceData, error: balanceError } = await supabase
        .from("dailybalances")
        .select("*")
        .order("date", { ascending: false })
        .limit(1);

      if (balanceError) {
        toast.error("Error fetching opening balances: " + balanceError.message);
      } else {
        const lastDayBalance = balanceData[0];
        setOpeningBalances({
          usd: lastDayBalance ? lastDayBalance.closing_usd : 0,
          lbp: lastDayBalance ? lastDayBalance.closing_lbp : 0,
        });
      }

      // Fetch users
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*");
      if (userError) {
        toast.error("Error fetching users: " + userError.message);
      } else {
        setUsers(userData);
      }

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("*")
        .limit(1);
      if (settingsError) {
        toast.error("Error fetching settings: " + settingsError.message);
      } else if (settingsData.length > 0) {
        setManualDateEnabled(settingsData[0].manual_date_enabled);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Calculate totals whenever transactions change
    calculateTotals();
  }, [credits, payments, sales, withdrawals]);

  const calculateTotals = useCallback(() => {
    const totalCreditsUSD = credits.reduce(
      (acc, credit) => acc + credit.amount_usd,
      0
    );
    const totalCreditsLBP = credits.reduce(
      (acc, credit) => acc + credit.amount_lbp,
      0
    );
    const totalPaymentsUSD = payments.reduce(
      (acc, payment) =>
        payment.deduction_source !== "daniel" ? acc + payment.amount_usd : acc,
      0
    );
    const totalPaymentsLBP = payments.reduce(
      (acc, payment) =>
        payment.deduction_source !== "daniel" ? acc + payment.amount_lbp : acc,
      0
    );
    const totalSalesUSD = sales.reduce((acc, sale) => acc + sale.amount_usd, 0);
    const totalSalesLBP = sales.reduce((acc, sale) => acc + sale.amount_lbp, 0);

    const totalWithdrawalsUSD = withdrawals.reduce(
      (acc, withdrawal) => acc + withdrawal.amount_usd,
      0
    );
    const totalWithdrawalsLBP = withdrawals.reduce(
      (acc, withdrawal) => acc + withdrawal.amount_lbp,
      0
    );

    const netUSD =
      openingBalances.usd +
      totalSalesUSD -
      totalCreditsUSD -
      totalPaymentsUSD -
      totalWithdrawalsUSD;
    const netLBP =
      openingBalances.lbp +
      totalSalesLBP -
      totalCreditsLBP -
      totalPaymentsLBP -
      totalWithdrawalsLBP;

    setTotals({ usd: netUSD, lbp: netLBP });
  }, [credits, payments, sales, withdrawals, openingBalances]);

  const addTransaction = (type, transaction) => {
    switch (type) {
      case "credit":
        setCredits((prev) => [...prev, transaction]);
        break;
      case "payment":
        setPayments((prev) => [...prev, transaction]);
        break;
      case "sale":
        setSales((prev) => [...prev, transaction]);
        break;
      case "withdrawal":
        setWithdrawals((prev) => [...prev, transaction]);
        break;
      default:
        break;
    }
  };

  const handleDelete = (type, key) => {
    switch (type) {
      case "credit":
        setCredits((prev) => prev.filter((item) => item.key !== key));
        break;
      case "payment":
        setPayments((prev) => prev.filter((item) => item.key !== key));
        break;
      case "sale":
        setSales((prev) => prev.filter((item) => item.key !== key));
        break;
      case "withdrawal":
        setWithdrawals((prev) => prev.filter((item) => item.key !== key));
        break;
      default:
        break;
    }
  };

  const handleConfirm = () => {
    // Confirm opening balances
    setIsConfirmed(true);
  };

  const handleClosingBalancesChange = (key, value) => {
    setClosingBalances((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error("Please select an employee to close the day.");
      return;
    }
    // Show modal for confirmation
    setIsModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    const { usd: closing_usd, lbp: closing_lbp } = closingBalances;
    const date = manualDateEnabled ? selectedDate : currentDate;

    try {
      const { data: balanceData, error: balanceError } = await supabase
        .from("dailybalances")
        .insert([
          {
            date,
            opening_usd: openingBalances.usd,
            opening_lbp: openingBalances.lbp,
            closing_usd,
            closing_lbp,
            user_id: selectedUser,
          },
        ]);

      if (balanceError) throw balanceError;

      // Insert credits
      for (const credit of credits) {
        const { error: creditError } = await supabase
          .from("credits")
          .insert([{ ...credit, date, user_id: selectedUser }]);
        if (creditError) throw creditError;
      }

      // Insert payments
      for (const payment of payments) {
        const { error: paymentError } = await supabase
          .from("payments")
          .insert([{ ...payment, date, user_id: selectedUser }]);
        if (paymentError) throw paymentError;
      }

      // Insert sales
      for (const sale of sales) {
        const { error: saleError } = await supabase
          .from("sales")
          .insert([{ ...sale, date, user_id: selectedUser }]);
        if (saleError) throw saleError;
      }

      // Insert withdrawals
      for (const withdrawal of withdrawals) {
        const { error: withdrawalError } = await supabase
          .from("daniel")
          .insert([{ ...withdrawal, date, user_id: selectedUser }]);
        if (withdrawalError) throw withdrawalError;
      }

      toast.success("Daily balance and transactions submitted successfully!");

      // Reset state after submission
      setCredits([]);
      setPayments([]);
      setSales([]);
      setWithdrawals([]);
      setOpeningBalances({ usd: closing_usd, lbp: closing_lbp });
      setIsModalVisible(false);
    } catch (error) {
      toast.error("Error submitting transactions: " + error.message);
    }
  };

  const handleSwitchChange = async (checked) => {
    setManualDateEnabled(checked);
    try {
      const { data, error } = await supabase
        .from("settings")
        .update({ manual_date_enabled: checked })
        .eq("id", 1); // Assuming there is only one settings row
      if (error) throw error;
    } catch (error) {
      toast.error("Error updating settings: " + error.message);
    }
  };

  return (
    <Layout className="layout">
      <ToastContainer />
      <Content style={{ padding: "0 50px" }}>
        <Tabs defaultActiveKey="1">
          <Tabs.TabPane tab="Main View" key="1">
            <div className="site-layout-content">
              <h1>Financial Tracking App</h1>
              <Row gutter={16}>
                <Col xs={24}>
                  <Card
                    title="Opening Balance"
                    actions={[
                      <Button type="primary" onClick={handleConfirm}>
                        Confirm
                      </Button>,
                    ]}
                  >
                    <Typography.Title level={5}>
                      Date: {currentDate.toISOString().split("T")[0]}
                    </Typography.Title>
                    <Typography.Title level={5}>
                      Closing USD: {formatNumber(openingBalances.usd)}
                    </Typography.Title>
                    <Typography.Title level={5}>
                      Closing LBP: {formatNumber(openingBalances.lbp)}
                    </Typography.Title>
                    <Typography.Text>
                      Please ensure that the amount of money currently available
                      matches the amount displayed. If they match, kindly click
                      "confirm" to continue.
                    </Typography.Text>
                  </Card>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: "20px" }}>
                <Col xs={24} sm={12}>
                  <Card title="Credits">
                    <Form
                      onFinish={(values) =>
                        addTransaction("credit", { ...values, key: Date.now() })
                      }
                    >
                      <Form.Item
                        name="amount_usd"
                        label="Amount USD"
                        rules={[
                          {
                            required: true,
                            message: "Please input amount in USD!",
                          },
                        ]}
                      >
                        <InputNumber
                          formatter={formatNumber}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        name="amount_lbp"
                        label="Amount LBP"
                        rules={[
                          {
                            required: true,
                            message: "Please input amount in LBP!",
                          },
                        ]}
                      >
                        <InputNumber
                          formatter={formatNumber}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        name="person"
                        label="Person"
                        rules={[
                          {
                            required: true,
                            message: "Please input the person!",
                          },
                        ]}
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
                      columns={[
                        {
                          title: "Amount USD",
                          dataIndex: "amount_usd",
                          key: "amount_usd",
                          render: formatNumber,
                        },
                        {
                          title: "Amount LBP",
                          dataIndex: "amount_lbp",
                          key: "amount_lbp",
                          render: formatNumber,
                        },
                        { title: "Person", dataIndex: "person", key: "person" },
                        {
                          title: "Action",
                          key: "action",
                          render: (_, record) => (
                            <Popconfirm
                              title="Sure to delete?"
                              onConfirm={() =>
                                handleDelete("credit", record.key)
                              }
                            >
                              <Button type="link">Delete</Button>
                            </Popconfirm>
                          ),
                        },
                      ]}
                      rowKey="key"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card title="Payments">
                    <Form
                      onFinish={(values) =>
                        addTransaction("payment", {
                          ...values,
                          key: Date.now(),
                        })
                      }
                    >
                      <Form.Item
                        name="amount_usd"
                        label="Amount USD"
                        rules={[
                          {
                            required: true,
                            message: "Please input amount in USD!",
                          },
                        ]}
                      >
                        <InputNumber
                          formatter={formatNumber}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        name="amount_lbp"
                        label="Amount LBP"
                        rules={[
                          {
                            required: true,
                            message: "Please input amount in LBP!",
                          },
                        ]}
                      >
                        <InputNumber
                          formatter={formatNumber}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        name="reference_number"
                        label="Reference Number"
                        rules={[
                          {
                            required: true,
                            message: "Please input the reference number!",
                          },
                        ]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name="cause"
                        label="Cause"
                        rules={[
                          {
                            required: true,
                            message: "Please input the cause!",
                          },
                        ]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name="deduction_source"
                        label="Deduction Source"
                        rules={[
                          {
                            required: true,
                            message: "Please select the deduction source!",
                          },
                        ]}
                      >
                        <Select placeholder="Select source">
                          <Option value="current_closing">
                            Current Closing
                          </Option>
                          <Option value="daniel">Daniel</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit">
                          Add Payment
                        </Button>
                      </Form.Item>
                    </Form>
                    <Table
                      dataSource={payments}
                      columns={[
                        {
                          title: "Amount USD",
                          dataIndex: "amount_usd",
                          key: "amount_usd",
                          render: formatNumber,
                        },
                        {
                          title: "Amount LBP",
                          dataIndex: "amount_lbp",
                          key: "amount_lbp",
                          render: formatNumber,
                        },
                        {
                          title: "Reference Number",
                          dataIndex: "reference_number",
                          key: "reference_number",
                        },
                        { title: "Cause", dataIndex: "cause", key: "cause" },
                        {
                          title: "Deduction Source",
                          dataIndex: "deduction_source",
                          key: "deduction_source",
                        },
                        {
                          title: "Action",
                          key: "action",
                          render: (_, record) => (
                            <Popconfirm
                              title="Sure to delete?"
                              onConfirm={() =>
                                handleDelete("payment", record.key)
                              }
                            >
                              <Button type="link">Delete</Button>
                            </Popconfirm>
                          ),
                        },
                      ]}
                      rowKey="key"
                    />
                  </Card>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: "20px" }}>
                <Col xs={24} sm={12}>
                  <Card title="Sales">
                    <Form
                      onFinish={(values) =>
                        addTransaction("sale", { ...values, key: Date.now() })
                      }
                    >
                      <Form.Item
                        name="amount_usd"
                        label="Amount USD"
                        rules={[
                          {
                            required: true,
                            message: "Please input amount in USD!",
                          },
                        ]}
                      >
                        <InputNumber
                          formatter={formatNumber}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        name="amount_lbp"
                        label="Amount LBP"
                        rules={[
                          {
                            required: true,
                            message: "Please input amount in LBP!",
                          },
                        ]}
                      >
                        <InputNumber
                          formatter={formatNumber}
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
                      columns={[
                        {
                          title: "Amount USD",
                          dataIndex: "amount_usd",
                          key: "amount_usd",
                          render: formatNumber,
                        },
                        {
                          title: "Amount LBP",
                          dataIndex: "amount_lbp",
                          key: "amount_lbp",
                          render: formatNumber,
                        },
                        {
                          title: "Action",
                          key: "action",
                          render: (_, record) => (
                            <Popconfirm
                              title="Sure to delete?"
                              onConfirm={() => handleDelete("sale", record.key)}
                            >
                              <Button type="link">Delete</Button>
                            </Popconfirm>
                          ),
                        },
                      ]}
                      rowKey="key"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card title="Withdrawals">
                    <Form
                      onFinish={(values) =>
                        addTransaction("withdrawal", {
                          ...values,
                          key: Date.now(),
                        })
                      }
                    >
                      <Form.Item
                        name="amount_usd"
                        label="Amount USD"
                        rules={[
                          {
                            required: true,
                            message: "Please input amount in USD!",
                          },
                        ]}
                      >
                        <InputNumber
                          formatter={formatNumber}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        name="amount_lbp"
                        label="Amount LBP"
                        rules={[
                          {
                            required: true,
                            message: "Please input amount in LBP!",
                          },
                        ]}
                      >
                        <InputNumber
                          formatter={formatNumber}
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
                      columns={[
                        {
                          title: "Amount USD",
                          dataIndex: "amount_usd",
                          key: "amount_usd",
                          render: formatNumber,
                        },
                        {
                          title: "Amount LBP",
                          dataIndex: "amount_lbp",
                          key: "amount_lbp",
                          render: formatNumber,
                        },
                        {
                          title: "Action",
                          key: "action",
                          render: (_, record) => (
                            <Popconfirm
                              title="Sure to delete?"
                              onConfirm={() =>
                                handleDelete("withdrawal", record.key)
                              }
                            >
                              <Button type="link">Delete</Button>
                            </Popconfirm>
                          ),
                        },
                      ]}
                      rowKey="key"
                    />
                  </Card>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: "20px" }}>
                <Col xs={24} sm={12}>
                  <Card title="Totals">
                    <Typography.Title level={4}>
                      Total in USD:{" "}
                      {(
                        totals.usd +
                        totals.lbp / exchangeRate
                      ).toLocaleString()}
                    </Typography.Title>
                    <p>USD: {formatNumber(totals.usd)}</p>
                    <p>LBP: {formatNumber(totals.lbp)}</p>
                    <Form.Item
                      label="Exchange Rate"
                      style={{ marginTop: "10px" }}
                    >
                      <InputNumber
                        prefix="LBP"
                        formatter={formatNumber}
                        defaultValue={DEFAULT_EXCHANGE_RATE}
                        onChange={(value) => setExchangeRate(value)}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card title="Closing Balance">
                    <Form>
                      <Form.Item label="Closing Balance USD">
                        <InputNumber
                          min={0}
                          value={closingBalances.usd}
                          onChange={(value) =>
                            handleClosingBalancesChange("usd", value)
                          }
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item label="Closing Balance LBP">
                        <InputNumber
                          min={0}
                          value={closingBalances.lbp}
                          onChange={(value) =>
                            handleClosingBalancesChange("lbp", value)
                          }
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Typography.Text>
                        Total in USD:{" "}
                        {(
                          closingBalances.usd +
                          closingBalances.lbp / exchangeRate
                        ).toLocaleString()}
                      </Typography.Text>
                      <Divider />
                      <Form.Item
                        name="closing_employee"
                        label="Select Closing Employee"
                        rules={[
                          {
                            required: true,
                            message: "Please select an employee!",
                          },
                        ]}
                      >
                        <Select
                          placeholder="Select an employee"
                          onChange={(value) => setSelectedUser(value)}
                        >
                          {users.map((user) => (
                            <Option key={user.id} value={user.id}>
                              {user.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      {manualDateEnabled && (
                        <Form.Item
                          name="closing_date"
                          label="Select Closing Date"
                          rules={[
                            {
                              required: true,
                              message: "Please select a date!",
                            },
                          ]}
                        >
                          <DatePicker
                            format="YYYY-MM-DD"
                            onChange={(date) => setSelectedDate(date)}
                          />
                        </Form.Item>
                      )}
                      <Form.Item>
                        <Button type="primary" onClick={handleSubmit}>
                          Close Today
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                </Col>
              </Row>
              <Modal
                title="Confirm Closing"
                visible={isModalVisible}
                onOk={handleConfirmSubmit}
                onCancel={() => setIsModalVisible(false)}
              >
                <p>Are you sure you want to close the day?</p>
                <p>Summary of added data:</p>
                <p>Credits: {credits.length}</p>
                <p>Payments: {payments.length}</p>
                <p>Sales: {sales.length}</p>
                <p>Withdrawals: {withdrawals.length}</p>
              </Modal>
            </div>
          </Tabs.TabPane>
          {user.role === "admin" && (
            <Tabs.TabPane tab="Admin Dashboard" key="2">
              <div style={{ marginTop: "40px" }}>
                <h2>Admin Dashboard</h2>
                <p>Switch to enable user to enter date manually</p>
                <div style={{ marginTop: "20px" }}>
                  <Switch
                    checked={manualDateEnabled}
                    onChange={handleSwitchChange}
                    checkedChildren="Manual Date"
                    unCheckedChildren="Auto Date"
                  />
                </div>
                <Divider />
              </div>
            </Tabs.TabPane>
          )}
        </Tabs>
      </Content>
      <Footer style={{ textAlign: "center" }}>Dekene Web App ©2024</Footer>
    </Layout>
  );
};

export default MainScreen;
