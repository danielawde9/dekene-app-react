import React, { useEffect, useState } from "react";
import {
  Layout,
  Menu,
  Row,
  Col,
  Card,
  Button,
  Select,
  Form,
  Modal,
} from "antd";
import { createClient } from "@supabase/supabase-js";
import DailyBalance from "./DailyBalance";
import Credits from "./Credits";
import Payments from "./Payments";
import Sales from "./Sales";
import Withdrawals from "./Withdrawals";
import TransactionTable from "./TransactionTable";
import LineChartComponent from "./LineChartComponent";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const { Header, Content, Footer } = Layout;
const { Option } = Select;

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const MainScreen = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openingBalances, setOpeningBalances] = useState({ usd: 0, lbp: 0 });
  const [credits, setCredits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sales, setSales] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [totals, setTotals] = useState({
    beforeWithdrawals: { usd: 0, lbp: 0 },
    afterWithdrawals: { usd: 0, lbp: 0 },
  });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    async function fetchOpeningBalances() {
      const { data, error } = await supabase
        .from("dailybalances")
        .select("*")
        .order("date", { ascending: false })
        .limit(1);

      if (error) {
        toast.error("Error fetching opening balances: " + error.message);
      } else {
        const lastDayBalance = data[0];
        setOpeningBalances({
          date: lastDayBalance ? lastDayBalance.date : "no date found",
          usd: lastDayBalance ? lastDayBalance.closing_usd : 0,
          lbp: lastDayBalance ? lastDayBalance.closing_lbp : 0,
        });
      }
    }

    async function fetchUsers() {
      const { data, error } = await supabase.from("users").select("*");

      if (error) {
        toast.error("Error fetching users: " + error.message);
      } else {
        setUsers(data);
      }
    }

    fetchOpeningBalances();
    fetchUsers();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [credits, payments, sales, withdrawals]);

  const addCredit = (credit) => {
    setCredits([...credits, credit]);
  };

  const addPayment = (payment) => {
    setPayments([...payments, payment]);
  };

  const addSale = (sale) => {
    setSales([...sales, sale]);
  };

  const addWithdrawal = (withdrawal) => {
    setWithdrawals([...withdrawals, withdrawal]);
  };

  const calculateTotals = () => {
    const totalCreditsUSD = credits.reduce(
      (acc, credit) => acc + credit.amount_usd,
      0
    );
    const totalCreditsLBP = credits.reduce(
      (acc, credit) => acc + credit.amount_lbp,
      0
    );
    const totalPaymentsUSD = payments.reduce(
      (acc, payment) => acc + payment.amount_usd,
      0
    );
    const totalPaymentsLBP = payments.reduce(
      (acc, payment) => acc + payment.amount_lbp,
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

    const beforeWithdrawalsUSD =
      openingBalances.usd - totalCreditsUSD - totalPaymentsUSD + totalSalesUSD;
    const beforeWithdrawalsLBP =
      openingBalances.lbp - totalCreditsLBP - totalPaymentsLBP + totalSalesLBP;

    const afterWithdrawalsUSD = beforeWithdrawalsUSD - totalWithdrawalsUSD;
    const afterWithdrawalsLBP = beforeWithdrawalsLBP - totalWithdrawalsLBP;

    setTotals({
      beforeWithdrawals: {
        usd: beforeWithdrawalsUSD,
        lbp: beforeWithdrawalsLBP,
      },
      afterWithdrawals: { usd: afterWithdrawalsUSD, lbp: afterWithdrawalsLBP },
    });
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error("Please select an employee to close the day.");
      return;
    }
    if (sales.length === 0 || withdrawals.length === 0) {
      toast.error("Please enter at least one sale and one withdrawal.");
      return;
    }
    setIsModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    const { usd: closing_usd, lbp: closing_lbp } = totals.afterWithdrawals;
    const date = currentDate.toISOString().split("T")[0];

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
          .from("withdrawals")
          .insert([{ ...withdrawal, date, user_id: selectedUser }]);
        if (withdrawalError) throw withdrawalError;
      }

      toast.success("Daily balance and transactions submitted successfully!");
      // Clear all the state after submission
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

  const generateMockData = async () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    let currentDate = new Date(thirtyDaysAgo);

    while (currentDate <= today) {
      const dateString = currentDate.toISOString().split("T")[0];
      const opening_usd = 1000 + Math.random() * 200 - 100; // Random fluctuation
      const opening_lbp = 1500000 + Math.random() * 300000 - 150000; // Random fluctuation

      const { data: balanceData, error: balanceError } = await supabase
        .from("dailybalances")
        .insert([
          {
            date: dateString,
            opening_usd,
            opening_lbp,
            closing_usd: opening_usd,
            closing_lbp: opening_lbp,
            user_id: 1, // Assuming user ID 1 is valid
          },
        ]);

      if (balanceError) {
        toast.error("Error inserting daily balance: " + balanceError.message);
        return;
      }

      // Insert random credits
      for (let i = 0; i < 3; i++) {
        const { error: creditError } = await supabase.from("credits").insert([
          {
            date: dateString,
            amount_usd: Math.random() * 50,
            amount_lbp: Math.random() * 75000,
            person: `Person ${i + 1}`,
            user_id: 1,
          },
        ]);
        if (creditError) throw creditError;
      }

      // Insert random payments
      for (let i = 0; i < 3; i++) {
        const { error: paymentError } = await supabase.from("payments").insert([
          {
            date: dateString,
            amount_usd: Math.random() * 100,
            amount_lbp: Math.random() * 150000,
            reference_number: `REF-${i + 1}`,
            cause: `Payment cause ${i + 1}`,
            user_id: 1,
          },
        ]);
        if (paymentError) throw paymentError;
      }

      // Insert random sales
      for (let i = 0; i < 3; i++) {
        const { error: saleError } = await supabase.from("sales").insert([
          {
            date: dateString,
            amount_usd: Math.random() * 200,
            amount_lbp: Math.random() * 300000,
            user_id: 1,
          },
        ]);
        if (saleError) throw saleError;
      }

      // Insert random withdrawals
      for (let i = 0; i < 3; i++) {
        const { error: withdrawalError } = await supabase
          .from("withdrawals")
          .insert([
            {
              date: dateString,
              amount_usd: Math.random() * 100,
              amount_lbp: Math.random() * 150000,
              user_id: 1,
            },
          ]);
        if (withdrawalError) throw withdrawalError;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    toast.success("Mock data generated successfully!");
  };

  return (
    <Layout className="layout">
      <ToastContainer />
      <Content style={{ padding: "0 50px" }}>
        <div className="site-layout-content">
          <h1>Financial Tracking App</h1>
          {/* <Button onClick={generateMockData}>Generate Mock Data</Button> */}
          <Row gutter={16}>
            <Col span={24}>
              <DailyBalance
                date={currentDate}
                openingBalances={openingBalances}
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: "20px" }}>
            <Col span={12}>
              <Credits addCredit={addCredit} />
            </Col>
            <Col span={12}>
              <Payments addPayment={addPayment} />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: "20px" }}>
            <Col span={12}>
              <Sales addSale={addSale} />
            </Col>
            <Col span={12}>
              <Withdrawals addWithdrawal={addWithdrawal} />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: "20px" }}>
            <Col span={12}>
              <Card title="Totals Before Withdrawals">
                <p>USD: {totals.beforeWithdrawals.usd.toLocaleString()}</p>
                <p>LBP: {totals.beforeWithdrawals.lbp.toLocaleString()}</p>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Totals After Withdrawals">
                <p>USD: {totals.afterWithdrawals.usd.toLocaleString()}</p>
                <p>LBP: {totals.afterWithdrawals.lbp.toLocaleString()}</p>
              </Card>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: "20px", textAlign: "center" }}>
            <Col span={24}>
              <Form>
                <Form.Item
                  name="closing_employee"
                  label="Select Closing Employee"
                  rules={[
                    { required: true, message: "Please select an employee!" },
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
                <Form.Item>
                  <Button type="primary" onClick={handleSubmit}>
                    Close Today
                  </Button>
                </Form.Item>
              </Form>
            </Col>
          </Row>
          <Modal
            title="Confirm Closing"
            open={isModalVisible}
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
          {user.role === "admin" && (
            <div style={{ marginTop: "40px" }}>
              <h2>Admin Dashboard</h2>
              <TransactionTable />
              <LineChartComponent />
            </div>
          )}
        </div>
      </Content>
      <Footer style={{ textAlign: "center" }}>Dekene Web App ©2024</Footer>
    </Layout>
  );
};

export default MainScreen;
