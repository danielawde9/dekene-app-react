import React, { useState, useEffect, useMemo } from "react";
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
  Divider,
  Typography,
  Card,
  Table,
  InputNumber,
  Popconfirm,
  Input,
  message,
  Radio,
  Spin,
} from "antd";
import { createClient } from "@supabase/supabase-js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TransactionTable from "./TransactionTable";
import moment from "moment";
import { CLOSING_ALLOWED, DEFAULT_EXCHANGE_RATE } from "../utils/constant";

const { Content, Footer } = Layout;
const { Option } = Select;

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const formatNumber = (value) => new Intl.NumberFormat().format(value);

const TRANSACTION_TYPES = {
  CREDITS: "credits",
  PAYMENTS: "payments",
  SALES: "sales",
  WITHDRAWALS: "withdrawals",
};

const MainScreen = ({ user }) => {
  const [currentDate] = useState(new Date());
  const [openingDate, setOpeningDate] = useState(null);
  const [openingBalances, setOpeningBalances] = useState({ usd: 0, lbp: 0 });
  const [closingBalances, setClosingBalances] = useState({ usd: 0, lbp: 0 });
  const [actualOpeningBalances, setActualOpeningBalances] = useState({
    usd: 0,
    lbp: 0,
  });
  const [transactions, setTransactions] = useState(() => {
    const storedTransactions = localStorage.getItem("transactions");
    return storedTransactions
      ? JSON.parse(storedTransactions)
      : {
        credits: [],
        payments: [],
        sales: [],
        withdrawals: [],
      };
  });

  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [manualDateEnabled, setManualDateEnabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(() => {
    const savedBranch = localStorage.getItem("selectedBranch");
    return savedBranch ? JSON.parse(savedBranch) : null;
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [unpaidCredits, setUnpaidCredits] = useState([]);
  const [closedDates, setClosedDates] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [isOpeningModalVisible, setIsOpeningModalVisible] = useState(false);
  const [forms] = useState({
    creditForm: Form.useForm()[0],
    paymentForm: Form.useForm()[0],
    saleForm: Form.useForm()[0],
    withdrawalForm: Form.useForm()[0],
    editForm: Form.useForm()[0],
  });

  useEffect(() => {
    if (selectedBranch !== null) {
      localStorage.setItem("selectedBranch", JSON.stringify(selectedBranch));
    } else {
      localStorage.removeItem("selectedBranch");
    }
  }, [selectedBranch]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: branchData, error: branchError } = await supabase
          .from("branches")
          .select("*");

        if (branchError) {
          toast.error("Error fetching branches: " + branchError.message);
        } else {
          setBranches(branchData);
        }
      } catch (error) {
        toast.error("Error fetching initial data: " + error.message);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const storedTransactions = localStorage.getItem("transactions");
    if (storedTransactions) {
      setTransactions(JSON.parse(storedTransactions));
    }
  }, []);

  useEffect(() => {
    if (selectedBranch !== null) {
      const fetchDataForBranch = async () => {
        try {
          const [
            { data: balanceData, error: balanceError },
            { data: closedDatesData, error: closedDatesError },
            { data: unpaidCreditsData, error: unpaidCreditsError },
            { data: userData, error: userError },
            { data: settingsData, error: settingsError },
          ] = await Promise.all([
            supabase
              .from("dailybalances")
              .select("*")
              .eq("branch_id", selectedBranch)
              .order("date", { ascending: false })
              .limit(1),
            supabase
              .from("dailybalances")
              .select("date")
              .eq("branch_id", selectedBranch),
            supabase
              .from("credits")
              .select("*")
              .eq("status", false)
              .eq("branch_id", selectedBranch),
            supabase.from("users").select("*"),
            supabase.from("settings").select("*").limit(1),
          ]);

          if (balanceError) throw balanceError;
          if (closedDatesError) throw closedDatesError;
          if (unpaidCreditsError) throw unpaidCreditsError;
          if (userError) throw userError;
          if (settingsError) throw settingsError;

          const lastDayBalance = balanceData[0];
          setOpeningBalances({
            usd: lastDayBalance ? lastDayBalance.closing_usd : 0,
            lbp: lastDayBalance ? lastDayBalance.closing_lbp : 0,
          });
          setActualOpeningBalances({
            usd: lastDayBalance ? lastDayBalance.closing_usd : 0,
            lbp: lastDayBalance ? lastDayBalance.closing_lbp : 0,
          });
          const adjustedDate = lastDayBalance
            ? moment(lastDayBalance.date).add(1, "days").toDate()
            : new Date();
          setOpeningDate(adjustedDate);

          const dates = closedDatesData.map((item) =>
            moment(item.date).format("YYYY-MM-DD")
          );
          setClosedDates(dates);

          setUnpaidCredits(unpaidCreditsData);
          setUsers(userData);

          if (settingsData.length > 0) {
            setManualDateEnabled(settingsData[0].manual_date_enabled);
          }
        } catch (error) {
          toast.error("Error fetching data: " + error.message);
        }
      };

      fetchDataForBranch();
    }
  }, [selectedBranch]);

  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }, [transactions]);

  const totals = useMemo(() => {
    const { credits, payments, sales, withdrawals } = transactions;

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
      actualOpeningBalances.usd +
      totalSalesUSD -
      totalCreditsUSD -
      totalPaymentsUSD -
      totalWithdrawalsUSD;
    const netLBP =
      actualOpeningBalances.lbp +
      totalSalesLBP -
      totalCreditsLBP -
      totalPaymentsLBP -
      totalWithdrawalsLBP;
    return { usd: netUSD, lbp: netLBP };
  }, [transactions, actualOpeningBalances]);

  const addTransaction = (transaction) => {
    setTransactions((prev) => ({
      ...prev,
      [transaction.type]: [...prev[transaction.type], transaction],
    }));
  };

  const handleDelete = (type, key) => {
    setTransactions((prev) => ({
      ...prev,
      [type]: prev[type].filter((item) => item.key !== key),
    }));
  };

  const handleConfirm = () => {
    setIsOpeningModalVisible(true);
  };

  const handleOpeningConfirmSubmit = async () => {
    // Calculate differences
    const difference_usd = actualOpeningBalances.usd - openingBalances.usd;
    const difference_lbp = actualOpeningBalances.lbp - openingBalances.lbp;
    const date = new Date(manualDateEnabled ? selectedDate : currentDate);
    date.setHours(date.getHours() + 3);

    if (!selectedUser) {
      toast.error("Please select an employee before confirming opening balances.");
      return;
    }

    try {
      // Insert into opening_differences
      if (difference_usd !== 0 || difference_lbp !== 0) {
        const { error } = await supabase.from("opening_differences").insert([
          {
            date,
            branch_id: selectedBranch,
            user_id: selectedUser,
            difference_usd,
            difference_lbp,
          },
        ]);

        if (error) throw error;
      }

      // Update opening balances to actual amounts
      setOpeningBalances({
        usd: actualOpeningBalances.usd,
        lbp: actualOpeningBalances.lbp,
      });
      setIsConfirmed(true);
      setIsOpeningModalVisible(false);
      toast.success("Opening balances confirmed!");
    } catch (error) {
      toast.error("Error confirming opening balances: " + error.message);
    }
  };

  const handleClosingBalancesChange = (key, value) => {
    setClosingBalances({ ...closingBalances, [key]: value });
  };

  const handleSubmit = () => {
    if (!selectedUser) {
      toast.error("Please select an employee to close the day.");
      return;
    }
    setIsModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    const { usd: closing_usd, lbp: closing_lbp } = closingBalances;
    const date = new Date(manualDateEnabled ? selectedDate : currentDate);
    date.setHours(date.getHours() + 3);
  
    // Calculate differences
    const difference_usd = closing_usd - totals.usd;
    const difference_lbp = closing_lbp - totals.lbp;
  
    try {
      // Insert into dailybalances
      const { error: balanceError } = await supabase
        .from("dailybalances")
        .insert([
          {
            date,
            opening_usd: openingBalances.usd,
            opening_lbp: openingBalances.lbp,
            closing_usd,
            closing_lbp,
            user_id: selectedUser,
            branch_id: selectedBranch,
          },
        ]);
  
      if (balanceError) throw balanceError;
  
      // Insert into closing_differences if there's a difference
      if (difference_usd !== 0 || difference_lbp !== 0) {
        const { error: diffError } = await supabase
          .from("closing_differences")
          .insert([
            {
              date,
              branch_id: selectedBranch,
              user_id: selectedUser,
              difference_usd,
              difference_lbp,
            },
          ]);
  
        if (diffError) throw diffError;
      }
  
      // Insert transactions into their respective tables
      for (const typeKey of Object.keys(transactions)) {
        const tableName = typeKey === "withdrawals" ? "daniel" : typeKey;
  
        // Exclude 'type' and 'key' from each transaction item
        const dataToInsert = transactions[typeKey].map(({ type, key, ...item }) => ({
          ...item,
          date,
          user_id: selectedUser,
          branch_id: selectedBranch,
        }));
  
        const { error } = await supabase.from(tableName).insert(dataToInsert);
        if (error) throw error;
      }
  
      toast.success("Daily balance and transactions submitted successfully!");
  
      // Reset transactions and update opening balances
      setTransactions({
        credits: [],
        payments: [],
        sales: [],
        withdrawals: [],
      });
      setOpeningBalances({ usd: closing_usd, lbp: closing_lbp });
      setActualOpeningBalances({ usd: closing_usd, lbp: closing_lbp });
      setIsModalVisible(false);
      localStorage.removeItem("transactions");
      window.location.reload();
    } catch (error) {
      toast.error("Error submitting transactions: " + error.message);
    }
  };
  

  const handleSwitchChange = async (checked) => {
    setManualDateEnabled(checked);
    try {
      const { error } = await supabase
        .from("settings")
        .update({ manual_date_enabled: checked })
        .eq("id", 1);
      if (error) throw error;
    } catch (error) {
      toast.error("Error updating settings: " + error.message);
    }
  };

  const handleUnpaidCreditSelection = (selectedCredits) => {
    const updatedCredits = unpaidCredits.filter((credit) =>
      selectedCredits.includes(credit.id)
    );

    updatedCredits.forEach((credit) => {
      credit.status = true;
      addTransaction({ ...credit, key: Date.now(), type: TRANSACTION_TYPES.CREDITS });
    });

    setUnpaidCredits((prev) =>
      prev.filter((credit) => !selectedCredits.includes(credit.id))
    );
  };

  const calculateTotalsAfterDaniel = () => {
    const closingBalanceInUSD =
      closingBalances.usd + closingBalances.lbp / exchangeRate;
    const totalsInUSD = totals.usd + totals.lbp / exchangeRate;

    const totalsAfterDanielUSD = closingBalanceInUSD - totalsInUSD;

    return {
      closingBalanceInUSD,
      totalsAfterDanielUSD,
    };
  };

  const { closingBalanceInUSD, totalsAfterDanielUSD } =
    calculateTotalsAfterDaniel();

  const isClosingAllowed = Math.abs(totalsAfterDanielUSD) <= CLOSING_ALLOWED;

  const disableDates = (current) => {
    const tomorrow = moment().endOf("day");
    const isClosedDate = closedDates.includes(current.format("YYYY-MM-DD"));
    return current && (current > tomorrow || isClosedDate);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsEditModalVisible(true);
    forms.editForm.setFieldsValue(item);
  };

  const handleEditSubmit = (values) => {
    const { key, type, ...rest } = values;
    setTransactions((prev) => ({
      ...prev,
      [type]: prev[type].map((item) =>
        item.key === key ? { ...item, ...rest } : item
      ),
    }));
    setIsEditModalVisible(false);
    message.success("Transaction updated successfully!");
  };

  const renderEditFormFields = () => {
    if (!editingItem) return null;
    const { type } = editingItem;

    switch (type) {
      case TRANSACTION_TYPES.CREDITS:
        return (
          <>
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
              <InputNumber formatter={formatNumber} style={{ width: "100%" }} />
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
              <InputNumber formatter={formatNumber} style={{ width: "100%" }} />
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
            <Form.Item
              name="status"
              label="Status"
              rules={[
                {
                  required: true,
                  message: "Please select the status!",
                },
              ]}
            >
              <Radio.Group>
                <Radio value={true}>Paid</Radio>
                <Radio value={false}>Unpaid</Radio>
              </Radio.Group>
            </Form.Item>
          </>
        );
      case TRANSACTION_TYPES.PAYMENTS:
        return (
          <>
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
            <Form.Item name="reference_number" label="Reference Number">
              <Input placeholder="Add a Reference Number" />
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
              <Input placeholder="Add a Cause" />
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
              <Select placeholder="Select deduction source">
                <Option value="current">Current Closing</Option>
                <Option value="daniel">Daniel</Option>
              </Select>
            </Form.Item>
          </>
        );
      case TRANSACTION_TYPES.SALES:
      case TRANSACTION_TYPES.WITHDRAWALS:
        return (
          <>
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
          </>
        );
      default:
        return null;
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <Layout className="layout">
      <ToastContainer />
      <Content style={{ padding: "0 16px" }}>
        {loadingBranches ? (
          <div style={{ textAlign: "center", marginTop: "50px" }}>
            <Spin size="large" tip="Loading branches..." />
          </div>
        ) : selectedBranch === null ? (
          <Card>
            <div className="site-layout-content">
              <h1>Select Branch</h1>
              <Form>
                <Form.Item
                  name="branch_id"
                  label="Branch"
                  rules={[
                    {
                      required: true,
                      message: "Please select a branch!",
                    },
                  ]}
                >
                  <Select
                    placeholder="Select a branch"
                    onChange={(value) => setSelectedBranch(value)}
                  >
                    {branches.map((branch) => (
                      <Option key={branch.id} value={branch.id}>
                        {branch.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Form>
            </div>
          </Card>
        ) : (
          <Tabs defaultActiveKey="1">
            <Tabs.TabPane tab="Main View" key="1">
              <div className="site-layout-content">
                <h1>Financial Tracking App</h1>
                <Row gutter={16}>
                  <Col xs={24}>
                    <Card
                      title="Opening Balance"
                      actions={[
                        <Button
                          type="primary"
                          onClick={handleConfirm}
                          disabled={isConfirmed}
                        >
                          Confirm
                        </Button>,
                      ]}
                    >
                      <Typography.Title level={5}>
                        Date:{" "}
                        {openingDate
                          ? openingDate.toISOString().split("T")[0]
                          : "Loading..."}
                      </Typography.Title>
                      <Typography.Title level={5}>
                        Expected USD: {formatNumber(openingBalances.usd)}
                      </Typography.Title>
                      <Typography.Title level={5}>
                        Expected LBP: {formatNumber(openingBalances.lbp)}
                      </Typography.Title>
                      <Form.Item
                        name="opening_employee"
                        label="Select Employee"
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
                          value={selectedUser}
                        >
                          {users.map((user) => (
                            <Option key={user.id} value={user.id}>
                              {user.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Typography.Text>
                        Please ensure that the amount of money currently available
                        matches the expected amount displayed. If they match, kindly
                        click "Confirm" to continue.
                      </Typography.Text>
                    </Card>
                  </Col>
                </Row>
                {isConfirmed && (
                  <>
                    <TransactionForms
                      addTransaction={addTransaction}
                      unpaidCredits={unpaidCredits}
                      handleUnpaidCreditSelection={handleUnpaidCreditSelection}
                      transactions={transactions}
                      handleDelete={handleDelete}
                      handleEdit={handleEdit}
                      forms={forms}
                    />
                    <TotalsAndClosing
                      totals={totals}
                      exchangeRate={exchangeRate}
                      setExchangeRate={setExchangeRate}
                      closingBalances={closingBalances}
                      handleClosingBalancesChange={handleClosingBalancesChange}
                      users={users}
                      setSelectedUser={setSelectedUser}
                      selectedUser={selectedUser}
                      manualDateEnabled={manualDateEnabled}
                      disableDates={disableDates}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      handleSubmit={handleSubmit}
                      isClosingAllowed={isClosingAllowed}
                      closingBalanceInUSD={closingBalanceInUSD}
                      totalsAfterDanielUSD={totalsAfterDanielUSD}
                      branches={branches}
                      selectedBranch={selectedBranch}
                      setSelectedBranch={setSelectedBranch}
                    />
                  </>
                )}
                <ConfirmationModal
                  isModalVisible={isModalVisible}
                  handleConfirmSubmit={handleConfirmSubmit}
                  setIsModalVisible={setIsModalVisible}
                  transactions={transactions}
                />
                <EditModal
                  isEditModalVisible={isEditModalVisible}
                  setIsEditModalVisible={setIsEditModalVisible}
                  forms={forms}
                  handleEditSubmit={handleEditSubmit}
                  renderEditFormFields={renderEditFormFields}
                />
                <Modal
                  title="Confirm Opening Balances"
                  visible={isOpeningModalVisible}
                  onOk={handleOpeningConfirmSubmit}
                  onCancel={() => setIsOpeningModalVisible(false)}
                >
                  <Form>
                    <Form.Item label="Actual Opening Balance USD">
                      <InputNumber
                        formatter={formatNumber}
                        min={0}
                        defaultValue={actualOpeningBalances.usd}
                        onChange={(value) =>
                          setActualOpeningBalances((prev) => ({ ...prev, usd: value }))
                        }
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                    <Form.Item label="Actual Opening Balance LBP">
                      <InputNumber
                        formatter={formatNumber}
                        min={0}
                        defaultValue={actualOpeningBalances.lbp}
                        onChange={(value) =>
                          setActualOpeningBalances((prev) => ({ ...prev, lbp: value }))
                        }
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Form>
                </Modal>
              </div>
            </Tabs.TabPane>
            {user.role === "admin" && (
              <>
                <Tabs.TabPane tab="Admin Dashboard" key="2">
                  <AdminDashboard
                    manualDateEnabled={manualDateEnabled}
                    handleSwitchChange={handleSwitchChange}
                    user={user}
                  />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Closing Differences" key="3">
                  <ClosingDifferencesTable selectedBranch={selectedBranch} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Opening Differences" key="4">
                  <OpeningDifferencesTable selectedBranch={selectedBranch} />
                </Tabs.TabPane>
              </>
            )}
          </Tabs>
        )}
      </Content>
      <Footer
        style={{
          textAlign: "center",
          display: "flex",
          gap: "2rem",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div>
          Dekene Web App ©2024, Developed by{" "}
          <a href="https://danielawde9.com">Daniel Awde</a>
        </div>
        <Button type="primary" onClick={handleLogout}>
          Logout
        </Button>
      </Footer>
    </Layout>
  );
};

export default MainScreen;

/* Additional Components */

const TransactionForms = ({
  addTransaction,
  unpaidCredits,
  handleUnpaidCreditSelection,
  transactions,
  handleDelete,
  handleEdit,
  forms,
}) => {
  return (
    <>
      <Row gutter={16}>
        <Col xs={24} sm={12} style={{ marginTop: "20px" }}>
          <TransactionCard
            title="Credits"
            type={TRANSACTION_TYPES.CREDITS}
            form={forms.creditForm}
            addTransaction={addTransaction}
            unpaidCredits={unpaidCredits}
            handleUnpaidCreditSelection={handleUnpaidCreditSelection}
            data={transactions.credits}
            handleDelete={handleDelete}
            handleEdit={handleEdit}
          />
        </Col>
        <Col xs={24} sm={12}>
          <TransactionCard
            title="Payments"
            type={TRANSACTION_TYPES.PAYMENTS}
            form={forms.paymentForm}
            addTransaction={addTransaction}
            data={transactions.payments}
            handleDelete={handleDelete}
            handleEdit={handleEdit}
          />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <TransactionCard
            title="Sales"
            type={TRANSACTION_TYPES.SALES}
            form={forms.saleForm}
            addTransaction={addTransaction}
            data={transactions.sales}
            handleDelete={handleDelete}
            handleEdit={handleEdit}
          />
        </Col>
        <Col xs={24} sm={12}>
          <TransactionCard
            title="Daniel"
            type={TRANSACTION_TYPES.WITHDRAWALS}
            form={forms.withdrawalForm}
            addTransaction={addTransaction}
            data={transactions.withdrawals}
            handleDelete={handleDelete}
            handleEdit={handleEdit}
          />
        </Col>
      </Row>
    </>
  );
};

const TransactionCard = ({
  title,
  type,
  form,
  addTransaction,
  unpaidCredits,
  handleUnpaidCreditSelection,
  data,
  handleDelete,
  handleEdit,
}) => {
  const renderFormFields = () => {
    switch (type) {
      case TRANSACTION_TYPES.CREDITS:
        return (
          <>
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
              <InputNumber formatter={formatNumber} style={{ width: "100%" }} />
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
              <InputNumber formatter={formatNumber} style={{ width: "100%" }} />
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
              <Input placeholder="Add a person" />
            </Form.Item>
            <Form.Item
              name="status"
              label="Status"
              rules={[
                {
                  required: true,
                  message: "Please select the status!",
                },
              ]}
            >
              <Radio.Group>
                <Radio value={true}>Paid</Radio>
                <Radio value={false}>Unpaid</Radio>
              </Radio.Group>
            </Form.Item>
          </>
        );
      case TRANSACTION_TYPES.PAYMENTS:
        return (
          <>
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
              <InputNumber formatter={formatNumber} style={{ width: "100%" }} />
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
              <InputNumber formatter={formatNumber} style={{ width: "100%" }} />
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
              <Input placeholder="Add a Reference Number" />
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
              <Input placeholder="Add a Cause" />
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
              <Select placeholder="Select deduction source">
                <Option value="current">Current Closing</Option>
                <Option value="daniel">Daniel</Option>
              </Select>
            </Form.Item>
          </>
        );
      case TRANSACTION_TYPES.SALES:
      case TRANSACTION_TYPES.WITHDRAWALS:
        return (
          <>
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
              <InputNumber formatter={formatNumber} style={{ width: "100%" }} />
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
              <InputNumber formatter={formatNumber} style={{ width: "100%" }} />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  const columns = useMemo(() => {
    const baseColumns = [
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
    ];

    const actionColumn = {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <>
          <Button type="link" onClick={() => handleEdit({ ...record, type })}>
            Edit
          </Button>
          <Popconfirm
            title="Sure to delete?"
            onConfirm={() => handleDelete(type, record.key)}
          >
            <Button type="link">Delete</Button>
          </Popconfirm>
        </>
      ),
    };

    switch (type) {
      case TRANSACTION_TYPES.CREDITS:
        return [
          ...baseColumns,
          {
            title: "Person",
            dataIndex: "person",
            key: "person",
          },
          {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => (status ? "Paid" : "Unpaid"),
          },
          actionColumn,
        ];
      case TRANSACTION_TYPES.PAYMENTS:
        return [
          ...baseColumns,
          {
            title: "Reference Number",
            dataIndex: "reference_number",
            key: "reference_number",
          },
          {
            title: "Cause",
            dataIndex: "cause",
            key: "cause",
          },
          {
            title: "Deduction Source",
            dataIndex: "deduction_source",
            key: "deduction_source",
          },
          actionColumn,
        ];
      default:
        return [...baseColumns, actionColumn];
    }
  }, [type, handleDelete, handleEdit]);

  return (
    <Card title={title} style={{ marginTop: 20 }}>
      <Form
        form={form}
        initialValues={{ amount_usd: 0, amount_lbp: 0 }}
        onFinish={(values) => {
          addTransaction({ ...values, key: Date.now(), type });
          form.resetFields();
        }}
      >
        {renderFormFields()}
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Add {title}
          </Button>
        </Form.Item>
      </Form>
      {type === TRANSACTION_TYPES.CREDITS && (
        <Form.Item label="Unpaid Credits">
          <Select
            mode="multiple"
            placeholder="Select unpaid credits to mark as paid"
            onChange={handleUnpaidCreditSelection}
          >
            {unpaidCredits.map((credit) => (
              <Option key={credit.id} value={credit.id}>
                {`USD: ${formatNumber(credit.amount_usd)}, LBP: ${formatNumber(
                  credit.amount_lbp
                )}, Person: ${credit.person}`}
              </Option>
            ))}
          </Select>
        </Form.Item>
      )}
      <Table
        dataSource={data}
        columns={columns}
        rowKey="key"
        scroll={{ x: true }}
      />
    </Card>
  );
};

const TotalsAndClosing = ({
  totals,
  exchangeRate,
  setExchangeRate,
  closingBalances,
  handleClosingBalancesChange,
  users,
  setSelectedUser,
  selectedUser,
  manualDateEnabled,
  disableDates,
  selectedDate,
  setSelectedDate,
  handleSubmit,
  isClosingAllowed,
  closingBalanceInUSD,
  totalsAfterDanielUSD,
  branches,
  selectedBranch,
  setSelectedBranch,
}) => {
  return (
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Card
          title="Totals"
          style={{ marginTop: "20px" }}
          actions={[
            <Typography.Title level={4}>
              Total in USD:{" "}
              {(totals.usd + totals.lbp / exchangeRate).toLocaleString()}
            </Typography.Title>,
          ]}
        >
          <p>USD: {formatNumber(totals.usd)}</p>
          <p>LBP: {formatNumber(totals.lbp)}</p>
          <Form.Item label="Exchange Rate" style={{ marginTop: "10px" }}>
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
        <Card title="Closing Balance" style={{ marginTop: "20px" }}>
          <Form>
            <Form.Item label="Closing Balance USD">
              <InputNumber
                formatter={formatNumber}
                min={0}
                value={closingBalances.usd}
                onChange={(value) => handleClosingBalancesChange("usd", value)}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item label="Closing Balance LBP">
              <InputNumber
                min={0}
                formatter={formatNumber}
                value={closingBalances.lbp}
                onChange={(value) => handleClosingBalancesChange("lbp", value)}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              name="branch_id"
              label="Branch"
              rules={[
                {
                  required: true,
                  message: "Please select a branch!",
                },
              ]}
            >
              <Select
                placeholder="Select a branch"
                onChange={(value) => setSelectedBranch(value)}
                value={selectedBranch}
              >
                {branches.map((branch) => (
                  <Option key={branch.id} value={branch.id}>
                    {branch.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Typography.Text>
              Total in USD: {closingBalanceInUSD.toLocaleString()}
            </Typography.Text>
            <Divider />
            <Typography.Text
              style={{
                color:
                  Math.abs(totalsAfterDanielUSD) <= CLOSING_ALLOWED
                    ? "green"
                    : "red",
              }}
            >
              Your closing difference amount is :{" "}
              {totalsAfterDanielUSD.toLocaleString()}
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
                value={selectedUser}
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
                  disabledDate={disableDates}
                />
              </Form.Item>
            )}
            <Form.Item>
              <Button
                type="primary"
                onClick={handleSubmit}
                disabled={!isClosingAllowed}
              >
                Close Today
              </Button>
              {!isClosingAllowed && (
                <Typography.Text type="danger">
                  Your closing amount is not correct, difference is greater than $
                  {CLOSING_ALLOWED}
                </Typography.Text>
              )}
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

const ConfirmationModal = ({
  isModalVisible,
  handleConfirmSubmit,
  setIsModalVisible,
  transactions,
}) => {
  const { credits, payments, sales, withdrawals } = transactions;
  return (
    <Modal
      title="Confirm Closing"
      open={isModalVisible}
      onOk={handleConfirmSubmit}
      onCancel={() => setIsModalVisible(false)}
      width={800}
    >
      <p>Are you sure you want to close the day?</p>
      <p>Summary of added data:</p>

      {/* Credits Table */}
      {credits.length > 0 && (
        <>
          <Typography.Title level={5}>Credits</Typography.Title>
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
              {
                title: "Person",
                dataIndex: "person",
                key: "person",
              },
              {
                title: "Status",
                dataIndex: "status",
                key: "status",
                render: (status) => (status ? "Paid" : "Unpaid"),
              },
            ]}
            pagination={false}
            rowKey="key"
          />
        </>
      )}

      {/* Payments Table */}
      {payments.length > 0 && (
        <>
          <Typography.Title level={5}>Payments</Typography.Title>
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
              {
                title: "Cause",
                dataIndex: "cause",
                key: "cause",
              },
              {
                title: "Deduction Source",
                dataIndex: "deduction_source",
                key: "deduction_source",
              },
            ]}
            pagination={false}
            rowKey="key"
          />
        </>
      )}

      {/* Sales Table */}
      {sales.length > 0 && (
        <>
          <Typography.Title level={5}>Sales</Typography.Title>
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
            ]}
            pagination={false}
            rowKey="key"
          />
        </>
      )}

      {/* Withdrawals Table */}
      {withdrawals.length > 0 && (
        <>
          <Typography.Title level={5}>Withdrawals</Typography.Title>
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
            ]}
            pagination={false}
            rowKey="key"
          />
        </>
      )}
    </Modal>
  );
};

const EditModal = ({
  isEditModalVisible,
  setIsEditModalVisible,
  forms,
  handleEditSubmit,
  renderEditFormFields,
}) => {
  return (
    <Modal
      title="Edit Transaction"
      open={isEditModalVisible}
      onOk={() => {
        forms.editForm.validateFields().then((values) => {
          handleEditSubmit(values);
          forms.editForm.resetFields();
        });
      }}
      onCancel={() => setIsEditModalVisible(false)}
    >
      <Form form={forms.editForm}>
        <Form.Item name="key" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="type" hidden>
          <Input />
        </Form.Item>
        {renderEditFormFields()}
      </Form>
    </Modal>
  );
};

const AdminDashboard = ({ manualDateEnabled, handleSwitchChange, user }) => {
  return (
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
      <TransactionTable
        adminUserId={user.id}
        exchangeRate={DEFAULT_EXCHANGE_RATE}
      />
    </div>
  );
};

const ClosingDifferencesTable = ({ selectedBranch }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchClosingDifferences = async () => {
      const { data: diffData, error } = await supabase
        .from("closing_differences")
        .select("*")
        .eq("branch_id", selectedBranch);

      if (error) {
        console.error("Error fetching closing differences:", error);
      } else {
        setData(diffData);
      }
    };

    if (selectedBranch) {
      fetchClosingDifferences();
    }
  }, [selectedBranch]);

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("YYYY-MM-DD"),
    },
    {
      title: "Difference USD",
      dataIndex: "difference_usd",
      key: "difference_usd",
    },
    {
      title: "Difference LBP",
      dataIndex: "difference_lbp",
      key: "difference_lbp",
    },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" />;
};

const OpeningDifferencesTable = ({ selectedBranch }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchOpeningDifferences = async () => {
      const { data: diffData, error } = await supabase
        .from("opening_differences")
        .select("*")
        .eq("branch_id", selectedBranch);

      if (error) {
        console.error("Error fetching opening differences:", error);
      } else {
        setData(diffData);
      }
    };

    if (selectedBranch) {
      fetchOpeningDifferences();
    }
  }, [selectedBranch]);

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("YYYY-MM-DD"),
    },
    {
      title: "Difference USD",
      dataIndex: "difference_usd",
      key: "difference_usd",
    },
    {
      title: "Difference LBP",
      dataIndex: "difference_lbp",
      key: "difference_lbp",
    },
  ];

  return <Table dataSource={data} columns={columns} rowKey="id" />;
};

