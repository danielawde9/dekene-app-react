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
  Spin,
  Collapse,
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
  CREDIT_PAYMENTS: "credit_payments",
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
        credit_payments: [],
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

  // State for Pay Credit Modal
  const [isPayCreditModalVisible, setIsPayCreditModalVisible] = useState(false);
  const [currentCredit, setCurrentCredit] = useState(null);
  const [payCreditForm] = Form.useForm();

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
    const storedIsConfirmed = localStorage.getItem('isConfirmed');
    if (storedIsConfirmed === 'true') {
      setIsConfirmed(true);
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
    const { credits, credit_payments, payments, sales, withdrawals } = transactions;

    // Calculate totals for new credits
    const totalNewCreditsUSD =
      credits?.reduce((acc, credit) => acc + credit.amount_usd, 0) || 0;
    const totalNewCreditsLBP =
      credits?.reduce((acc, credit) => acc + credit.amount_lbp, 0) || 0;

    // Calculate totals for credit payments
    const totalCreditPaymentsUSD =
      credit_payments?.reduce((acc, payment) => acc + payment.amount_usd, 0) || 0;
    const totalCreditPaymentsLBP =
      credit_payments?.reduce((acc, payment) => acc + payment.amount_lbp, 0) || 0;

    // Existing calculations for payments, sales, withdrawals...
    const totalPaymentsUSD =
      payments?.reduce(
        (acc, payment) =>
          payment.deduction_source !== "daniel" ? acc + payment.amount_usd : acc,
        0
      ) || 0;
    const totalPaymentsLBP =
      payments?.reduce(
        (acc, payment) =>
          payment.deduction_source !== "daniel" ? acc + payment.amount_lbp : acc,
        0
      ) || 0;
    const totalSalesUSD =
      sales?.reduce((acc, sale) => acc + sale.amount_usd, 0) || 0;
    const totalSalesLBP =
      sales?.reduce((acc, sale) => acc + sale.amount_lbp, 0) || 0;
    const totalWithdrawalsUSD =
      withdrawals?.reduce((acc, withdrawal) => acc + withdrawal.amount_usd, 0) || 0;
    const totalWithdrawalsLBP =
      withdrawals?.reduce((acc, withdrawal) => acc + withdrawal.amount_lbp, 0) || 0;

    const netUSD =
      actualOpeningBalances.usd +
      totalSalesUSD +
      totalCreditPaymentsUSD -
      totalNewCreditsUSD -
      totalPaymentsUSD -
      totalWithdrawalsUSD;
    const netLBP =
      actualOpeningBalances.lbp +
      totalSalesLBP +
      totalCreditPaymentsLBP -
      totalNewCreditsLBP -
      totalPaymentsLBP -
      totalWithdrawalsLBP;

    return { usd: netUSD, lbp: netLBP };
  }, [transactions, actualOpeningBalances]);

  const addTransaction = (transaction) => {
    setTransactions((prev) => {
      const updatedTransactions = { ...prev };
      if (transaction.type === TRANSACTION_TYPES.CREDIT_PAYMENTS) {
        // Add to credit payments
        if (!updatedTransactions.credit_payments) {
          updatedTransactions.credit_payments = [];
        }
        updatedTransactions.credit_payments.push(transaction);
      } else {
        // Existing logic
        updatedTransactions[transaction.type] = [
          ...prev[transaction.type],
          transaction,
        ];
      }
      return updatedTransactions;
    });
  };

  const handleDelete = (type, key) => {
    setTransactions((prev) => ({
      ...prev,
      [type]: prev[type].filter((item) => {
        if (item.key === key && item.isAutoGenerated) {
          message.error("This transaction cannot be deleted.");
          return true; // Keep the item
        }
        return item.key !== key;
      }),
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
      // Insert into opening_differences (existing code)
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

        // Create a credit transaction for the difference
        const selectedBranchName = branches.find(branch => branch.id === selectedBranch)?.name || "Unknown Branch";
        const selectedUserName = users.find(user => user.id === selectedUser)?.name || "Unknown User";

        const creditTransaction = {
          key: Date.now(),
          type: TRANSACTION_TYPES.CREDITS,
          amount_usd: Math.abs(difference_usd),
          amount_lbp: Math.abs(difference_lbp),
          person: `Opening Difference - ${selectedUserName} - ${selectedBranchName} `,
          status: false,
          paid_amount_usd: 0,
          paid_amount_lbp: 0,
          isAutoGenerated: true, // Mark as auto-generated
        };

        // Add the credit transaction
        setTransactions((prev) => {
          const updatedCredits = [...prev.credits, creditTransaction];
          return { ...prev, credits: updatedCredits };
        });
      }

      // Update opening balances to actual amounts (existing code)
      setOpeningBalances({
        usd: actualOpeningBalances.usd,
        lbp: actualOpeningBalances.lbp,
      });
      setIsConfirmed(true);
      setIsOpeningModalVisible(false);
      toast.success("Opening balances confirmed!");
      localStorage.setItem('isConfirmed', 'true'); // Save to local storage

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

      // Process credits separately
      const { credits, credit_payments } = transactions;

      // Handle new credits
      if (credits && credits.length > 0) {
        const newCreditsData = credits.map(({ type, key, ...item }) => ({
          ...item,
          date,
          user_id: selectedUser,
          branch_id: selectedBranch,
        }));

        const { error } = await supabase.from("credits").insert(newCreditsData);
        if (error) throw error;
      }

      // Handle credit payments
      if (credit_payments && credit_payments.length > 0) {
        for (const payment of credit_payments) {
          const { amount_usd, amount_lbp, credit_id } = payment;

          // Fetch the current credit
          const { data: creditData, error: fetchError } = await supabase
            .from("credits")
            .select("*")
            .eq("id", credit_id)
            .single();

          if (fetchError) throw fetchError;

          const newPaidAmountUSD = creditData.paid_amount_usd + amount_usd;
          const newPaidAmountLBP = creditData.paid_amount_lbp + amount_lbp;

          const isFullyPaidUSD = newPaidAmountUSD >= creditData.amount_usd;
          const isFullyPaidLBP = newPaidAmountLBP >= creditData.amount_lbp;
          const status = isFullyPaidUSD && isFullyPaidLBP;

          // Update the credit record
          const { error: updateError } = await supabase
            .from("credits")
            .update({
              paid_amount_usd: newPaidAmountUSD,
              paid_amount_lbp: newPaidAmountLBP,
              status,
            })
            .eq("id", credit_id);

          if (updateError) throw updateError;
        }
      }

      // Handle other transactions (payments, sales, withdrawals)
      const transactionTypes = ["payments", "sales", "withdrawals"];

      for (const typeKey of transactionTypes) {
        const tableName = typeKey === "withdrawals" ? "daniel" : typeKey;

        const dataToInsert = transactions[typeKey]?.map(
          ({ type, key, ...item }) => ({
            ...item,
            date,
            user_id: selectedUser,
            branch_id: selectedBranch,
          })
        );

        if (dataToInsert && dataToInsert.length > 0) {
          const { error } = await supabase.from(tableName).insert(dataToInsert);
          if (error) throw error;
        }
      }

      toast.success("Daily balance and transactions submitted successfully!");

      // Reset transactions and update opening balances
      setTransactions({
        credits: [],
        credit_payments: [],
        payments: [],
        sales: [],
        withdrawals: [],
      });
      setOpeningBalances({ usd: closing_usd, lbp: closing_lbp });
      setActualOpeningBalances({ usd: closing_usd, lbp: closing_lbp });
      setIsModalVisible(false);
      localStorage.removeItem("transactions");
      setIsConfirmed(false);

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

  const handlePayCredit = (credit) => {
    setCurrentCredit(credit);
    setIsPayCreditModalVisible(true);
    payCreditForm.resetFields();
  };

  const handlePayCreditSubmit = (values) => {
    const { pay_amount_usd = 0, pay_amount_lbp = 0 } = values;

    // Create a transaction for the payment
    const transaction = {
      key: Date.now(),
      type: TRANSACTION_TYPES.CREDIT_PAYMENTS,
      person: currentCredit.person,
      amount_usd: pay_amount_usd,
      amount_lbp: pay_amount_lbp,
      credit_id: currentCredit.id,
    };

    addTransaction(transaction);

    // Update the unpaidCredits list
    setUnpaidCredits((prevUnpaidCredits) =>
      prevUnpaidCredits
        .map((credit) => {
          if (credit.id === currentCredit.id) {
            const newPaidAmountUSD = credit.paid_amount_usd + pay_amount_usd;
            const newPaidAmountLBP = credit.paid_amount_lbp + pay_amount_lbp;

            const isPaidInUSD = newPaidAmountUSD >= credit.amount_usd;
            const isPaidInLBP = newPaidAmountLBP >= credit.amount_lbp;
            const isFullyPaid = isPaidInUSD && isPaidInLBP;

            return {
              ...credit,
              paid_amount_usd: newPaidAmountUSD,
              paid_amount_lbp: newPaidAmountLBP,
              status: isFullyPaid,
            };
          }
          return credit;
        })
        .filter((credit) => !credit.status) // Remove fully paid credits
    );

    setIsPayCreditModalVisible(false);
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
    if (item.isAutoGenerated) {
      message.error("This transaction cannot be edited.");
      return;
    }
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
      case TRANSACTION_TYPES.CREDIT_PAYMENTS:
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
          </>
        );
      default:
        return null;
    }
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
          <SelectBranchComponent branches={branches} setSelectedBranch={setSelectedBranch} />
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
                      handlePayCredit={handlePayCredit}
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
                  open={isOpeningModalVisible}
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

                {/* Pay Credit Modal */}
                <Modal
                  title="Pay Credit"
                  open={isPayCreditModalVisible}
                  onOk={() => {
                    payCreditForm.validateFields().then((values) => {
                      handlePayCreditSubmit(values);
                      payCreditForm.resetFields();
                    });
                  }}
                  onCancel={() => setIsPayCreditModalVisible(false)}
                >
                  <Form form={payCreditForm}>
                    <Form.Item label="Person">
                      <Input value={currentCredit?.person} disabled />
                    </Form.Item>
                    <Form.Item label="Total Amount USD">
                      <Input value={formatNumber(currentCredit?.amount_usd)} disabled />
                    </Form.Item>
                    <Form.Item label="Total Amount LBP">
                      <Input value={formatNumber(currentCredit?.amount_lbp)} disabled />
                    </Form.Item>
                    <Form.Item label="Paid Amount USD">
                      <Input
                        value={formatNumber(currentCredit?.paid_amount_usd)}
                        disabled
                      />
                    </Form.Item>
                    <Form.Item label="Paid Amount LBP">
                      <Input
                        value={formatNumber(currentCredit?.paid_amount_lbp)}
                        disabled
                      />
                    </Form.Item>
                    <Form.Item
                      name="pay_amount_usd"
                      label="Pay Amount USD"
                      rules={[
                        {
                          required:
                            currentCredit?.amount_usd -
                            currentCredit?.paid_amount_usd >
                            0,
                          message: "Please input the amount in USD!",
                        },
                      ]}
                    >
                      <InputNumber
                        min={0}
                        max={
                          currentCredit?.amount_usd - currentCredit?.paid_amount_usd
                        }
                        formatter={formatNumber}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                    <Form.Item
                      name="pay_amount_lbp"
                      label="Pay Amount LBP"
                      rules={[
                        {
                          required:
                            currentCredit?.amount_lbp -
                            currentCredit?.paid_amount_lbp >
                            0,
                          message: "Please input the amount in LBP!",
                        },
                      ]}
                    >
                      <InputNumber
                        min={0}
                        max={
                          currentCredit?.amount_lbp - currentCredit?.paid_amount_lbp
                        }
                        formatter={formatNumber}
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
      <FooterComponent />
    </Layout>
  );
};

export default MainScreen;

const SelectBranchComponent = ({ branches, setSelectedBranch }) => {
  return (
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
  );
}

const TransactionForms = ({
  addTransaction,
  unpaidCredits,
  handlePayCredit,
  transactions,
  handleDelete,
  handleEdit,
  forms,
}) => {
  return (
    <>
      <Row gutter={16}>
        <Col xs={24} sm={14}>
          <TransactionCard
            title="Credits"
            type={TRANSACTION_TYPES.CREDITS}
            form={forms.creditForm}
            addTransaction={addTransaction}
            unpaidCredits={unpaidCredits}
            handlePayCredit={handlePayCredit}
            data={transactions.credits}
            handleDelete={handleDelete}
            handleEdit={handleEdit}
          />
        </Col>
        <Col xs={24} sm={10}>
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
  handlePayCredit,
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
            <Form.Item name="status" label="Status" initialValue={false} hidden>
              <Input />
            </Form.Item>
            <Form.Item name="paid_amount_usd" initialValue={0} hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="paid_amount_lbp" initialValue={0} hidden>
              <InputNumber />
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
          <Button
            type="link"
            onClick={() => handleEdit({ ...record, type })}
            disabled={record.isAutoGenerated}
          >
            Edit
          </Button>
          <Popconfirm
            title="Sure to delete?"
            onConfirm={() => handleDelete(type, record.key)}
            disabled={record.isAutoGenerated}
          >
            <Button type="link" disabled={record.isAutoGenerated}>
              Delete
            </Button>
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
      case TRANSACTION_TYPES.CREDIT_PAYMENTS:
        return [
          ...baseColumns,
          {
            title: "Person",
            dataIndex: "person",
            key: "person",
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
        initialValues={{
          amount_usd: 0,
          amount_lbp: 0,
          status: false,
          paid_amount_usd: 0,
          paid_amount_lbp: 0,
          isAutoGenerated: false, // Default to false
        }}
        onFinish={(values) => {
          addTransaction({ ...values, key: Date.now(), type });
          form.resetFields();
        }}
      >
        {renderFormFields()}
        <Form.Item name="isAutoGenerated" initialValue={false} hidden>
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Add {title}
          </Button>
        </Form.Item>
      </Form>
      {type === TRANSACTION_TYPES.CREDITS && (
        <Collapse defaultActiveKey={[]} style={{ marginTop: 20, marginBottom: 20, padding: 0 }}>
          <Collapse.Panel header="Unpaid Credits" key="1" style={{ padding: 0 }}>
            <Table
              dataSource={unpaidCredits}
              columns={[
                { title: "Person", dataIndex: "person", key: "person" },
                { title: "Total Amount USD", dataIndex: "amount_usd", key: "amount_usd", render: formatNumber },
                { title: "Total Amount LBP", dataIndex: "amount_lbp", key: "amount_lbp", render: formatNumber },
                { title: "Paid Amount USD", dataIndex: "paid_amount_usd", key: "paid_amount_usd", render: formatNumber },
                { title: "Paid Amount LBP", dataIndex: "paid_amount_lbp", key: "paid_amount_lbp", render: formatNumber },
                {
                  title: "Remaining Amount USD",
                  key: "remaining_usd",
                  render: (text, record) => formatNumber(record.amount_usd - record.paid_amount_usd),
                },
                {
                  title: "Remaining Amount LBP",
                  key: "remaining_lbp",
                  render: (text, record) => formatNumber(record.amount_lbp - record.paid_amount_lbp),
                },
                {
                  title: "Action",
                  key: "action",
                  render: (_, record) => (
                    <Button type="primary" onClick={() => handlePayCredit(record)}>
                      Pay
                    </Button>
                  ),
                },
              ]}
              rowKey="id"
              pagination={false}
            />
          </Collapse.Panel>
        </Collapse>
      )}
      <Table dataSource={data} columns={columns} rowKey="key" scroll={{ x: true }} />
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

const FooterComponent = () => {
  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };
  return (
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
  );
}