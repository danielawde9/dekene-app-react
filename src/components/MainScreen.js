import React, { useEffect, useState, useCallback } from "react";
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
} from "antd";
import { createClient } from "@supabase/supabase-js";
import DailyBalance from "./DailyBalance";
import Credits from "./Credits";
import Payments from "./Payments";
import Sales from "./Sales";
import Daniel from "./Daniel";
import TransactionTable from "./TransactionTable";
import TotalsCard from "./TotalsCard";
import ClosingBalanceForm from "./ClosingBalanceForm";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatDateToUTC, formatNumber } from "../utils/formatNumber";
import Item from "antd/es/list/Item";
import LineChartComponent from "./LineChartComponent";

const { Content, Footer } = Layout;

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const MainScreen = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openingBalances, setOpeningBalances] = useState({ usd: 0, lbp: 0 });
  const [credits, setCredits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sales, setSales] = useState([]);
  const [daniel, setDaniel] = useState([]);
  const [totals, setTotals] = useState({
    beforeDaniel: { usd: 0, lbp: 0 },
    afterDaniel: { usd: 0, lbp: 0 },
  });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(90000);
  const [manualDateEnabled, setManualDateEnabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [missingDates, setMissingDates] = useState([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [closingBalances, setClosingBalances] = useState({ usd: 0, lbp: 0 });
  const [difference, setDifference] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const fetchOpeningBalances = async () => {
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
      };

      const fetchUsers = async () => {
        const { data, error } = await supabase.from("users").select("*");

        if (error) {
          toast.error("Error fetching users: " + error.message);
        } else {
          setUsers(data);
        }
      };

      const fetchSettings = async () => {
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .limit(1);

        if (error) {
          toast.error("Error fetching settings: " + error.message);
        } else if (data.length > 0) {
          setManualDateEnabled(data[0].manual_date_enabled);
        }
      };

      const checkMissingDates = async () => {
        const { data, error } = await supabase
          .from("dailybalances")
          .select("date")
          .order("date", { ascending: true });

        if (error) {
          toast.error("Error fetching daily balances: " + error.message);
          return;
        }

        const dates = data.map((record) => new Date(record.date));
        const missingDates = [];
        let date = new Date(dates[0]);

        while (date <= currentDate) {
          if (
            date.getDay() !== 0 &&
            !dates.some((d) => d.getTime() === date.getTime())
          ) {
            missingDates.push(new Date(date));
          }
          date.setDate(date.getDate() + 1);
        }

        setMissingDates(missingDates);
      };

      await Promise.all([
        fetchOpeningBalances(),
        fetchUsers(),
        fetchSettings(),
        checkMissingDates(),
      ]);
    };

    fetchData();
  }, [currentDate]);

  useEffect(() => {
    calculateTotals();
  }, [credits, payments, sales, daniel]);

  const handleTransactionChange = useCallback(() => {
    calculateTotals();
  }, [credits, payments, sales, daniel]);

  const addCredit = useCallback(
    (credit) => {
      setCredits([...credits, credit]);
      handleTransactionChange();
    },
    [credits, handleTransactionChange]
  );

  const addPayment = useCallback(
    (payment) => {
      setPayments([...payments, payment]);
      handleTransactionChange();
    },
    [payments, handleTransactionChange]
  );

  const addSale = useCallback(
    (sale) => {
      setSales([...sales, sale]);
      handleTransactionChange();
    },
    [sales, handleTransactionChange]
  );

  const addWithdrawal = useCallback(
    (withdrawal) => {
      setDaniel([...daniel, withdrawal]);
      handleTransactionChange();
    },
    [daniel, handleTransactionChange]
  );

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
    const totalDanielUSD = daniel.reduce(
      (acc, withdrawal) => acc + withdrawal.amount_usd,
      0
    );
    const totalDanielLBP = daniel.reduce(
      (acc, withdrawal) => acc + withdrawal.amount_lbp,
      0
    );

    const beforeDanielUSD =
      openingBalances.usd - totalCreditsUSD - totalPaymentsUSD + totalSalesUSD;
    const beforeDanielLBP =
      openingBalances.lbp - totalCreditsLBP - totalPaymentsLBP + totalSalesLBP;

    const afterDanielUSD = beforeDanielUSD - totalDanielUSD;
    const afterDanielLBP = beforeDanielLBP - totalDanielLBP;

    setTotals({
      beforeDaniel: {
        usd: beforeDanielUSD,
        lbp: beforeDanielLBP,
      },
      afterDaniel: { usd: afterDanielUSD, lbp: afterDanielLBP },
    });
  }, [credits, payments, sales, daniel, openingBalances]);

  const calculateTotalInUSD = useCallback(
    (usd, lbp) => usd + lbp / exchangeRate,
    [exchangeRate]
  );

  const handleConfirm = useCallback(() => {
    setIsConfirmed(true);
  }, []);

  const updateClosingBalance = (amountUSD, amountLBP) => {
    setClosingBalances((prev) => ({
      usd: prev.usd + amountUSD,
      lbp: prev.lbp + amountLBP,
    }));
  };

  const handleClosingBalancesChange = useCallback(
    (updatedBalances) => {
      const { usd, lbp } = updatedBalances;
      if (
        usd !== undefined &&
        lbp !== undefined &&
        !isNaN(usd) &&
        !isNaN(lbp)
      ) {
        setClosingBalances(updatedBalances);
        const closingTotalUSD = calculateTotalInUSD(usd, lbp);
        const danielTotalUSD = calculateTotalInUSD(
          totals.afterDaniel.usd,
          totals.afterDaniel.lbp
        );
        setDifference(Math.abs(closingTotalUSD - danielTotalUSD));
      }
    },
    [calculateTotalInUSD, totals]
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedUser) {
      toast.error("Please select an employee to close the day.");
      return;
    }
    if (sales.length === 0 || daniel.length === 0) {
      toast.error("Please enter at least one sale and one withdrawal.");
      return;
    }
    setIsModalVisible(true);
  }, [selectedUser, sales, daniel]);

  const handleConfirmSubmit = useCallback(async () => {
    const { usd: closing_usd, lbp: closing_lbp } = closingBalances;
    const date = manualDateEnabled
      ? formatDateToUTC(selectedDate)
      : formatDateToUTC(currentDate);

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
        const { error: paymentError } = await supabase.from("payments").insert([
          {
            ...payment,
            date,
            user_id: selectedUser,
            deduction_source: "daniel",
          },
        ]);
        if (paymentError) throw paymentError;

        // Update withdrawal if necessary
        if (payment.deduction_source === "daniel") {
          const { error: withdrawalUpdateError } = await supabase
            .from("daniel")
            .update({
              amount_usd: payment.amount_usd,
              amount_lbp: payment.amount_lbp,
            })
            .eq("date", date);
          if (withdrawalUpdateError) throw withdrawalUpdateError;
        }
      }

      // Insert sales
      for (const sale of sales) {
        const { error: saleError } = await supabase
          .from("sales")
          .insert([{ ...sale, date, user_id: selectedUser }]);
        if (saleError) throw saleError;
      }

      // Insert daniel
      for (const withdrawal of daniel) {
        const { error: withdrawalError } = await supabase
          .from("daniel")
          .insert([{ ...withdrawal, date, user_id: selectedUser }]);
        if (withdrawalError) throw withdrawalError;
      }

      toast.success("Daily balance and transactions submitted successfully!");
      // Clear all the state after submission
      setCredits([]);
      setPayments([]);
      setSales([]);
      setDaniel([]);
      setOpeningBalances({ usd: closing_usd, lbp: closing_lbp });
      setIsModalVisible(false);
    } catch (error) {
      toast.error("Error submitting transactions: " + error.message);
    }
  }, [
    selectedUser,
    openingBalances,
    credits,
    payments,
    sales,
    daniel,
    closingBalances,
    manualDateEnabled,
    selectedDate,
    currentDate,
  ]);

  const handleSwitchChange = useCallback(async (checked) => {
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
  }, []);

  return (
    <Layout className="layout">
      <ToastContainer />
      <Content style={{ padding: "0 50px" }}>
        <Tabs defaultActiveKey="1">
          <Item tab="Main View" key="1">
            <div className="site-layout-content">
              <h1>Financial Tracking App</h1>
              {missingDates.length > 0 && (
                <Alert
                  message="Missing dates detected"
                  description={
                    <>
                      Please fill out the missing dates:
                      <ul>
                        {missingDates.map((date) => (
                          <li key={date.toISOString()}>
                            {date.toISOString().split("T")[0]}
                          </li>
                        ))}
                      </ul>
                    </>
                  }
                  type="error"
                  showIcon
                  style={{ marginBottom: 20 }}
                />
              )}
              <Row gutter={16}>
                <Col xs={24} span={24}>
                  <DailyBalance
                    date={currentDate}
                    openingBalances={openingBalances}
                    onConfirm={handleConfirm}
                  />
                </Col>
              </Row>
              {isConfirmed && (
                <>
                  <Row gutter={16} style={{ marginTop: "20px" }}>
                    <Col xs={24} sm={12} style={{ marginTop: "20px" }}>
                      <Credits
                        addCredit={addCredit}
                        selectedUser={selectedUser}
                        updateClosingBalance={updateClosingBalance}
                      />
                    </Col>
                    <Col xs={24} sm={12} style={{ marginTop: "20px" }}>
                      <Payments
                        addPayment={addPayment}
                        selectedUser={selectedUser}
                      />
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: "20px" }}>
                    <Col xs={24} sm={12} style={{ marginTop: "20px" }}>
                      <Sales addSale={addSale} selectedUser={selectedUser} />
                    </Col>
                    <Col xs={24} sm={12} style={{ marginTop: "20px" }}>
                      <Daniel
                        addWithdrawal={addWithdrawal}
                        selectedUser={selectedUser}
                      />
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} sm={12} style={{ marginTop: "20px" }}>
                      <TotalsCard
                        title="Totals Before Daniel"
                        totals={totals.beforeDaniel}
                        exchangeRate={exchangeRate}
                        setExchangeRate={setExchangeRate}
                        calculateTotalInUSD={calculateTotalInUSD}
                      />
                    </Col>
                    <Col xs={24} sm={12} style={{ marginTop: "20px" }}>
                      <TotalsCard
                        title="Totals After Daniel"
                        totals={totals.afterDaniel}
                        exchangeRate={exchangeRate}
                        setExchangeRate={setExchangeRate}
                        calculateTotalInUSD={calculateTotalInUSD}
                        difference={difference}
                      />
                    </Col>
                  </Row>
                  <Row
                    gutter={16}
                    style={{ marginTop: "20px", textAlign: "center" }}
                  >
                    <Col xs={24} span={24} type="flex" align="middle">
                      <ClosingBalanceForm
                        closingBalances={closingBalances}
                        setClosingBalances={handleClosingBalancesChange}
                        exchangeRate={exchangeRate}
                        title="Confirm Closing"
                        difference={difference}
                        users={users}
                        setSelectedUser={setSelectedUser}
                        manualDateEnabled={manualDateEnabled}
                        missingDates={missingDates}
                        setSelectedDate={setSelectedDate}
                        handleSubmit={handleSubmit}
                      />
                    </Col>
                  </Row>
                </>
              )}
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
                <p>Daniel: {daniel.length}</p>
              </Modal>
            </div>
          </Item>
          {user.role === "admin" && (
            <Item tab="Admin Dashboard" key="2">
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
                <Typography.Title level={3}>Transaction Table</Typography.Title>
                <TransactionTable
                  selectedUser={selectedUser}
                  openingBalance={openingBalances}
                />
              </div>
            </Item>
          )}
        </Tabs>
      </Content>
      <Footer style={{ textAlign: "center" }}>Dekene Web App ©2024</Footer>
    </Layout>
  );
};

export default MainScreen;
