// TransactionTable.js

import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Form,
  Select,
  Card,
  Typography,
  Input,
  Row,
  Col,
  Divider,
  DatePicker,
} from "antd";
import { createClient } from "@supabase/supabase-js";
import { formatNumber } from "../utils/formatNumber";
import { ToastContainer, toast } from "react-toastify";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from "recharts";
import "react-toastify/dist/ReactToastify.css";
import moment from "moment";

const { RangePicker } = DatePicker;

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TransactionTable = ({ adminUserId, exchangeRate }) => {
  const [isConvertModalVisible, setIsConvertModalVisible] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [credits, setCredits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dailyBalances, setDailyBalances] = useState([]);
  const [sales, setSales] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [filteredChartData, setFilteredChartData] = useState([]);
  const [form] = Form.useForm();
  const [convertForm] = Form.useForm();
  const [balance, setBalance] = useState({ usd: 0, lbp: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [conversionType, setConversionType] = useState("usd_to_lbp");
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [lineVisibility, setLineVisibility] = useState({
    opening_usd: true,
    closing_usd: true,
    opening_lbp: true,
    closing_lbp: true,
  });

  useEffect(() => {
    fetchUsers();
    fetchBranches();
    fetchAllData();
  }, []);

  useEffect(() => {
    filterChartData();
  }, [chartData, dateRange]);

  const fetchBranches = async () => {
    const { data, error } = await supabase.from("branches").select("*");
    if (error) {
      console.error("Error fetching branches:", error);
    } else {
      setBranches(data);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("users").select("*");
    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data);
    }
  };

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [
        { data: paymentsData, error: paymentsError },
        { data: withdrawalsData, error: withdrawalsError },
        { data: conversionsData, error: conversionsError },
        { data: creditsData, error: creditsError },
        { data: dailyBalancesData, error: dailyBalancesError },
        { data: salesData, error: salesError },
      ] = await Promise.all([
        supabase.from("payments").select("*"),
        supabase.from("daniel").select("*"),
        supabase.from("conversions").select("*"),
        supabase.from("credits").select("*"),
        supabase.from("dailybalances").select("*"),
        supabase.from("sales").select("*"),
      ]);

      if (
        paymentsError ||
        withdrawalsError ||
        conversionsError ||
        creditsError ||
        dailyBalancesError ||
        salesError
      ) {
        console.error(
          "Error fetching data",
          paymentsError ||
          withdrawalsError ||
          conversionsError ||
          creditsError ||
          dailyBalancesError ||
          salesError
        );
        return;
      }

      setPayments(paymentsData);
      setWithdrawals(withdrawalsData);
      setCredits(creditsData);
      setDailyBalances(dailyBalancesData);
      setSales(salesData);

      const transactions = [
        ...paymentsData.map((item) => ({ ...item, type: "Payment" })),
        ...withdrawalsData.map((item) => ({ ...item, type: "Withdrawal" })),
        ...conversionsData.map((item) => ({ ...item, type: "Conversion" })),
      ];

      transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      setTransactions(transactions);

      const totalDanielUSD = withdrawalsData.reduce(
        (acc, item) => acc + item.amount_usd,
        0
      );
      const totalDanielLBP = withdrawalsData.reduce(
        (acc, item) => acc + item.amount_lbp,
        0
      );
      const totalPaymentsUSD = paymentsData.reduce(
        (acc, item) => acc + item.amount_usd,
        0
      );
      const totalPaymentsLBP = paymentsData.reduce(
        (acc, item) => acc + item.amount_lbp,
        0
      );
      const totalConversionsUSD = conversionsData.reduce(
        (acc, item) =>
          acc +
          (item.original_currency === "USD" ? -item.amount_usd : item.amount_usd),
        0
      );
      const totalConversionsLBP = conversionsData.reduce(
        (acc, item) =>
          acc +
          (item.original_currency === "LBP" ? -item.amount_lbp : item.amount_lbp),
        0
      );

      setBalance({
        usd: totalDanielUSD - totalPaymentsUSD + totalConversionsUSD,
        lbp: totalDanielLBP - totalPaymentsLBP + totalConversionsLBP,
      });

      prepareAggregatedData(
        paymentsData,
        withdrawalsData,
        creditsData,
        dailyBalancesData,
        salesData
      );

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  const prepareAggregatedData = (
    paymentsData,
    withdrawalsData,
    creditsData,
    dailyBalancesData,
    salesData
  ) => {
    const dateMap = {};

    // Process dailyBalancesData
    dailyBalancesData.forEach((item) => {
      const date = item.date;
      if (!dateMap[date]) {
        dateMap[date] = { date };
      }
      dateMap[date].opening_usd = item.opening_usd;
      dateMap[date].opening_lbp = item.opening_lbp;
      dateMap[date].closing_usd = item.closing_usd;
      dateMap[date].closing_lbp = item.closing_lbp;
    });

    // Process paymentsData
    paymentsData.forEach((item) => {
      const date = item.date;
      if (!dateMap[date]) {
        dateMap[date] = { date };
      }
      if (!dateMap[date].payments_usd) dateMap[date].payments_usd = 0;
      if (!dateMap[date].payments_lbp) dateMap[date].payments_lbp = 0;

      dateMap[date].payments_usd += item.amount_usd;
      dateMap[date].payments_lbp += item.amount_lbp;
    });

    // Process creditsData
    creditsData.forEach((item) => {
      const date = item.date;
      if (!dateMap[date]) {
        dateMap[date] = { date };
      }
      if (!dateMap[date].credits_usd) dateMap[date].credits_usd = 0;
      if (!dateMap[date].credits_lbp) dateMap[date].credits_lbp = 0;

      dateMap[date].credits_usd += item.amount_usd;
      dateMap[date].credits_lbp += item.amount_lbp;
    });

    // Process salesData
    salesData.forEach((item) => {
      const date = item.date;
      if (!dateMap[date]) {
        dateMap[date] = { date };
      }
      if (!dateMap[date].sales_usd) dateMap[date].sales_usd = 0;
      if (!dateMap[date].sales_lbp) dateMap[date].sales_lbp = 0;

      dateMap[date].sales_usd += item.amount_usd;
      dateMap[date].sales_lbp += item.amount_lbp;
    });

    // Process withdrawalsData
    withdrawalsData.forEach((item) => {
      const date = item.date;
      if (!dateMap[date]) {
        dateMap[date] = { date };
      }
      if (!dateMap[date].withdrawals_usd) dateMap[date].withdrawals_usd = 0;
      if (!dateMap[date].withdrawals_lbp) dateMap[date].withdrawals_lbp = 0;

      dateMap[date].withdrawals_usd += item.amount_usd;
      dateMap[date].withdrawals_lbp += item.amount_lbp;
    });

    // Convert dateMap to array
    const aggregatedData = Object.values(dateMap).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    setChartData(aggregatedData);
  };

  const filterChartData = () => {
    if (dateRange) {
      const [startDate, endDate] = dateRange;
      const filteredData = chartData.filter((item) => {
        const itemDate = moment(item.date, "YYYY-MM-DD");
        return (
          itemDate.isSameOrAfter(startDate, "day") &&
          itemDate.isSameOrBefore(endDate, "day")
        );
      });
      setFilteredChartData(filteredData);
    } else {
      setFilteredChartData(chartData);
    }
  };

  const addTransaction = async (values, type) => {
    try {
      const transaction = {
        ...values,
        date: values.date,
        type,
        user_id: adminUserId,
        branch_id: values.branch_id || 0,
      };

      const { error } = await supabase
        .from(type.toLowerCase() + "s")
        .insert([transaction]);

      if (error) {
        toast.error("Error adding transaction: " + error.message);
      } else {
        setTransactions([transaction, ...transactions]);
        toast.success("Transaction added successfully!");

        if (type === "Payment" && values.deduction_source === "daniel") {
          setBalance((prevBalance) => ({
            usd: prevBalance.usd - values.amount_usd,
            lbp: prevBalance.lbp - values.amount_lbp,
          }));
        } else if (type === "Withdrawal") {
          setBalance((prevBalance) => ({
            usd: prevBalance.usd + values.amount_usd,
            lbp: prevBalance.lbp + values.amount_lbp,
          }));
        }
      }

      form.resetFields();
      setIsPaymentModalVisible(false);
      setIsConvertModalVisible(false);
      setConvertedAmount(null);
      fetchAllData();
    } catch (error) {
      toast.error("Error adding transaction: " + error.message);
    }
  };

  const handleDelete = async (record) => {
    const { type, id, amount_usd, amount_lbp } = record;

    try {
      const { error } = await supabase
        .from(type.toLowerCase() + "s")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Error deleting transaction: " + error.message);
      } else {
        setTransactions(
          transactions.filter((transaction) => transaction.id !== id)
        );
        toast.success("Transaction deleted successfully!");

        if (type === "Payment" && record.deduction_source === "daniel") {
          setBalance((prevBalance) => ({
            usd: prevBalance.usd + amount_usd,
            lbp: prevBalance.lbp + amount_lbp,
          }));
        } else if (type === "Withdrawal") {
          setBalance((prevBalance) => ({
            usd: prevBalance.usd - amount_usd,
            lbp: prevBalance.lbp - amount_lbp,
          }));
        }
      }
      fetchAllData();
    } catch (error) {
      toast.error("Error deleting transaction: " + error.message);
    }
  };

  const handleConvert = async (values) => {
    const convertedTransaction =
      conversionType === "usd_to_lbp"
        ? {
          date: values.date,
          amount_usd: values.amount_usd,
          amount_lbp: values.amount_usd * exchangeRate,
          exchange_rate: exchangeRate,
          type: "Conversion",
          user_id: adminUserId,
          original_currency: "USD",
          converted_currency: "LBP",
          branch_id: values.branch_id || 0,
        }
        : {
          date: values.date,
          amount_usd: values.amount_lbp / exchangeRate,
          amount_lbp: values.amount_lbp,
          type: "Conversion",
          exchange_rate: exchangeRate,
          user_id: adminUserId,
          original_currency: "LBP",
          converted_currency: "USD",
          branch_id: values.branch_id || 0,
        };

    try {
      const { error } = await supabase
        .from("conversions")
        .insert([convertedTransaction]);

      if (error) {
        toast.error("Error adding conversion: " + error.message);
      } else {
        setTransactions([convertedTransaction, ...transactions]);
        toast.success("Conversion added successfully!");
        setConvertedAmount(null);
        setIsConvertModalVisible(false);
        convertForm.resetFields();
        fetchAllData();
      }
    } catch (error) {
      toast.error("Error adding conversion: " + error.message);
    }
  };

  const handleAmountChange = (value) => {
    if (conversionType === "usd_to_lbp") {
      setConvertedAmount(value * exchangeRate);
    } else {
      setConvertedAmount(value / exchangeRate);
    }
  };

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
  };

  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
  };

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Button
          type="primary"
          onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
          size="small"
          style={{ width: 90, marginRight: 8 }}
        >
          Search
        </Button>
        <Button
          onClick={() => handleReset(clearFilters)}
          size="small"
          style={{ width: 90 }}
        >
          Reset
        </Button>
      </div>
    ),
    filterIcon: (filtered) => (
      <i
        className="fas fa-search"
        style={{ color: filtered ? "#1890ff" : undefined }}
      />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase())
        : "",
  });

  const transactionsColumns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      align: "center",
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      ...getColumnSearchProps("date"),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      align: "center",
      filters: [
        { text: "Payment", value: "Payment" },
        { text: "Withdrawal", value: "Withdrawal" },
        { text: "Conversion", value: "Conversion" },
      ],
      onFilter: (value, record) => record.type.includes(value),
    },
    {
      title: "Original Currency",
      dataIndex: "original_currency",
      key: "original_currency",
      align: "center",
    },
    {
      title: "Converted Currency",
      dataIndex: "converted_currency",
      key: "converted_currency",
      align: "center",
    },
    {
      title: "Daniel",
      children: [
        {
          title: "USD",
          dataIndex: "amount_usd",
          key: "withdrawal_usd",
          render: (text, record) =>
            record.type === "Withdrawal" || record.type === "Conversion"
              ? formatNumber(record.amount_usd)
              : null,
          align: "center",
          sorter: (a, b) => a.amount_usd - b.amount_usd,
        },
        {
          title: "LBP",
          dataIndex: "amount_lbp",
          key: "withdrawal_lbp",
          render: (text, record) =>
            record.type === "Withdrawal" || record.type === "Conversion"
              ? formatNumber(record.amount_lbp)
              : null,
          align: "center",
          sorter: (a, b) => a.amount_lbp - b.amount_lbp,
        },
      ],
    },
    {
      title: "Payment",
      children: [
        {
          title: "USD",
          dataIndex: "amount_usd",
          key: "payment_usd",
          render: (text, record) =>
            record.type === "Payment" ? formatNumber(record.amount_usd) : null,
          align: "center",
          sorter: (a, b) => a.amount_usd - b.amount_usd,
        },
        {
          title: "LBP",
          dataIndex: "amount_lbp",
          key: "payment_lbp",
          render: (text, record) =>
            record.type === "Payment" ? formatNumber(record.amount_lbp) : null,
          align: "center",
          sorter: (a, b) => a.amount_lbp - b.amount_lbp,
        },
      ],
    },
    {
      title: "Branch",
      dataIndex: "branch_id",
      key: "branch_id",
      render: (branchId) => {
        const branch = branches.find((branch) => branch.id === branchId);
        return branch ? branch.name : "N/A";
      },
      align: "center",
      filters: branches.map((branch) => ({
        text: branch.name,
        value: branch.id,
      })),
      onFilter: (value, record) => record.branch_id === value,
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      render: (text, record) => (
        <Button type="link" onClick={() => handleDelete(record)}>
          Delete
        </Button>
      ),
    },
  ];

  const paymentsColumns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      align: "center",
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      ...getColumnSearchProps("date"),
    },
    {
      title: "Amount USD",
      dataIndex: "amount_usd",
      key: "amount_usd",
      render: formatNumber,
      align: "center",
      sorter: (a, b) => a.amount_usd - b.amount_usd,
    },
    {
      title: "Amount LBP",
      dataIndex: "amount_lbp",
      key: "amount_lbp",
      render: formatNumber,
      align: "center",
      sorter: (a, b) => a.amount_lbp - b.amount_lbp,
    },
    {
      title: "Cause",
      dataIndex: "cause",
      key: "cause",
      align: "center",
      ...getColumnSearchProps("cause"),
    },
    {
      title: "Deduction Source",
      dataIndex: "deduction_source",
      key: "deduction_source",
      align: "center",
      filters: [
        { text: "Daniel", value: "daniel" },
        { text: "Other", value: "other" },
      ],
      onFilter: (value, record) => record.deduction_source.includes(value),
    },
    {
      title: "Reference Number",
      dataIndex: "reference_number",
      key: "reference_number",
      align: "center",
    },
    {
      title: "Branch",
      dataIndex: "branch_id",
      key: "branch_id",
      render: (branchId) => {
        const branch = branches.find((branch) => branch.id === branchId);
        return branch ? branch.name : "N/A";
      },
      align: "center",
      filters: branches.map((branch) => ({
        text: branch.name,
        value: branch.id,
      })),
      onFilter: (value, record) => record.branch_id === value,
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      render: (text, record) => (
        <Button
          type="link"
          onClick={() => handleDelete({ ...record, type: "Payment" })}
        >
          Delete
        </Button>
      ),
    },
  ];

  const creditsColumns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      align: "center",
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      ...getColumnSearchProps("date"),
    },
    {
      title: "Amount USD",
      dataIndex: "amount_usd",
      key: "amount_usd",
      render: formatNumber,
      align: "center",
      sorter: (a, b) => a.amount_usd - b.amount_usd,
    },
    {
      title: "Amount LBP",
      dataIndex: "amount_lbp",
      key: "amount_lbp",
      render: formatNumber,
      align: "center",
      sorter: (a, b) => a.amount_lbp - b.amount_lbp,
    },
    {
      title: "Person",
      dataIndex: "person",
      key: "person",
      align: "center",
      ...getColumnSearchProps("person"),
    },
    {
      title: "Branch",
      dataIndex: "branch_id",
      key: "branch_id",
      render: (branchId) => {
        const branch = branches.find((branch) => branch.id === branchId);
        return branch ? branch.name : "N/A";
      },
      align: "center",
      filters: branches.map((branch) => ({
        text: branch.name,
        value: branch.id,
      })),
      onFilter: (value, record) => record.branch_id === value,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (status ? "Paid" : "Unpaid"),
      align: "center",
      filters: [
        { text: "Paid", value: true },
        { text: "Unpaid", value: false },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      render: (text, record) => (
        <Button
          type="link"
          onClick={() => handleDelete({ ...record, type: "credit" })}
        >
          Delete
        </Button>
      ),
    },
  ];

  const dailyBalancesColumns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      align: "center",
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      ...getColumnSearchProps("date"),
    },
    {
      title: "Opening USD",
      dataIndex: "opening_usd",
      key: "opening_usd",
      render: formatNumber,
      align: "center",
      sorter: (a, b) => a.opening_usd - b.opening_usd,
    },
    {
      title: "Opening LBP",
      dataIndex: "opening_lbp",
      key: "opening_lbp",
      render: formatNumber,
      align: "center",
      sorter: (a, b) => a.opening_lbp - b.opening_lbp,
    },
    {
      title: "Closing USD",
      dataIndex: "closing_usd",
      key: "closing_usd",
      render: formatNumber,
      align: "center",
      sorter: (a, b) => a.closing_usd - b.closing_usd,
    },
    {
      title: "Closing LBP",
      dataIndex: "closing_lbp",
      key: "closing_lbp",
      render: formatNumber,
      align: "center",
      sorter: (a, b) => a.closing_lbp - b.closing_lbp,
    },
    {
      title: "Paid Credits",
      key: "paid_credits",
      align: "center",
      render: (_, record) => {
        const paidCredits = credits.filter(
          (credit) => credit.date === record.date && credit.status
        );
        return paidCredits.length > 0 ? "Click to + expand" : "None";
      },
    },
    {
      title: "Unpaid Credits",
      key: "unpaid_credits",
      align: "center",
      render: (_, record) => {
        const unpaidCredits = credits.filter(
          (credit) => credit.date === record.date && !credit.status
        );
        return unpaidCredits.length > 0 ? "Click to + expand" : "None";
      },
    },
    {
      title: "Payments",
      key: "payments",
      align: "center",
      render: (_, record) => {
        const dailyPayments = payments.filter(
          (payment) => payment.date === record.date
        );
        return dailyPayments.length > 0 ? "Click to + expand" : "None";
      },
    },
    {
      title: "Withdrawals (Daniel)",
      key: "withdrawals",
      align: "center",
      render: (_, record) => {
        const dailyWithdrawals = withdrawals.filter(
          (withdrawal) => withdrawal.date === record.date
        );
        return dailyWithdrawals.length
          ? dailyWithdrawals.map((withdrawal) => (
            <div key={withdrawal.id}>
              <p>{`USD: ${formatNumber(withdrawal.amount_usd)}`}</p>
              <p>{`LBP: ${formatNumber(withdrawal.amount_lbp)}`}</p>
            </div>
          ))
          : "None";
      },
    },
    {
      title: "User",
      dataIndex: "user_id",
      key: "user_id",
      render: (userId) => {
        const user = users.find((user) => user.id === userId);
        return user ? user.name : "N/A";
      },
      align: "center",
      filters: users.map((user) => ({
        text: user.name,
        value: user.id,
      })),
      onFilter: (value, record) => record.user_id === value,
    },
    {
      title: "Branch",
      dataIndex: "branch_id",
      key: "branch_id",
      render: (branchId) => {
        const branch = branches.find((branch) => branch.id === branchId);
        return branch ? branch.name : "N/A";
      },
      align: "center",
      filters: branches.map((branch) => ({
        text: branch.name,
        value: branch.id,
      })),
      onFilter: (value, record) => record.branch_id === value,
    },
  ];

  const salesColumns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      align: "center",
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      ...getColumnSearchProps("date"),
    },
    {
      title: "Amount USD",
      dataIndex: "amount_usd",
      key: "amount_usd",
      render: formatNumber,
      align: "center",
      sorter: (a, b) => a.amount_usd - b.amount_usd,
    },
    {
      title: "Amount LBP",
      dataIndex: "amount_lbp",
      key: "amount_lbp",
      render: formatNumber,
      align: "center",
      sorter: (a, b) => a.amount_lbp - b.amount_lbp,
    },
    {
      title: "Branch",
      dataIndex: "branch_id",
      key: "branch_id",
      render: (branchId) => {
        const branch = branches.find((branch) => branch.id === branchId);
        return branch ? branch.name : "N/A";
      },
      align: "center",
      filters: branches.map((branch) => ({
        text: branch.name,
        value: branch.id,
      })),
      onFilter: (value, record) => record.branch_id === value,
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      render: (text, record) => (
        <Button type="link" onClick={() => handleDelete({ ...record, type: "sale" })}>
          Delete
        </Button>
      ),
    },
  ];

  const expandedRowRender = (record) => {
    const dailyPayments = payments.filter(
      (payment) => payment.date === record.date
    );
    const dailyUnpaidCredits = credits.filter(
      (credit) => credit.date === record.date && !credit.status
    );
    const dailyPaidCredits = credits.filter(
      (credit) => credit.date === record.date && credit.status
    );

    return (
      <Row gutter={[16, 16]}>
        {dailyPayments.length > 0 && (
          <Col span={24}>
            <Typography.Title level={4}>Payments</Typography.Title>
          </Col>
        )}
        {dailyPayments.map((payment) => (
          <Col key={payment.id} span={8}>
            <Card title={`Payment ID: ${payment.id}`} bordered={false}>
              <p>{`USD: ${formatNumber(payment.amount_usd)}`}</p>
              <p>{`LBP: ${formatNumber(payment.amount_lbp)}`}</p>
              <p>{`Ref: ${payment.reference_number}`}</p>
              <p>{`Cause: ${payment.cause}`}</p>
              <p>{`Deduction: ${payment.deduction_source}`}</p>
            </Card>
          </Col>
        ))}
        {dailyUnpaidCredits.length > 0 && (
          <Col span={24}>
            <Typography.Title level={4}>Unpaid Credits</Typography.Title>
          </Col>
        )}
        {dailyUnpaidCredits.map((credit) => (
          <Col key={credit.id} span={8}>
            <Card title={`Credit ID: ${credit.id}`} bordered={false}>
              <p>{`USD: ${formatNumber(credit.amount_usd)}`}</p>
              <p>{`LBP: ${formatNumber(credit.amount_lbp)}`}</p>
              <p>{`Person: ${credit.person}`}</p>
            </Card>
          </Col>
        ))}

        {dailyPaidCredits.length > 0 && (
          <Col span={24}>
            <Typography.Title level={4}>Paid Credits</Typography.Title>
          </Col>
        )}
        {dailyPaidCredits.map((credit) => (
          <Col key={credit.id} span={8}>
            <Card title={`Credit ID: ${credit.id}`} bordered={false}>
              <p>{`USD: ${formatNumber(credit.amount_usd)}`}</p>
              <p>{`LBP: ${formatNumber(credit.amount_lbp)}`}</p>
              <p>{`Person: ${credit.person}`}</p>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const handleLegendClick = (e) => {
    const { dataKey } = e;
    setLineVisibility((prevState) => ({
      ...prevState,
      [dataKey]: !prevState[dataKey],
    }));
  };

  return (
    <>
      <ToastContainer />
      <Button
        type="primary"
        onClick={() => setIsPaymentModalVisible(true)}
        style={{ marginRight: 16, marginBottom: 20 }}
      >
        Add Payment
      </Button>
      <Button
        type="default"
        onClick={() => {
          setConversionType("usd_to_lbp");
          setIsConvertModalVisible(true);
        }}
        style={{ marginRight: 16, marginBottom: 20 }}
      >
        Convert USD to LBP
      </Button>
      <Button
        type="default"
        onClick={() => {
          setConversionType("lbp_to_usd");
          setIsConvertModalVisible(true);
        }}
        style={{ marginRight: 16, marginBottom: 20 }}
      >
        Convert LBP to USD
      </Button>

      <Card title="Current Balance" style={{ marginTop: 20, marginBottom: 20 }}>
        <p>USD: {formatNumber(balance.usd)}</p>
        <p>LBP: {formatNumber(balance.lbp)}</p>
      </Card>

      <Card
        title="Filter Charts by Date Range"
        style={{ marginTop: 20, marginBottom: 20 }}
      >
        <RangePicker
          onChange={(dates) => {
            setDateRange(dates);
          }}
        />
      </Card>

      <Card
        title="Balance Over Time"
        style={{ marginTop: 20, marginBottom: 20 }}
      >
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={filteredChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis
              yAxisId="left"
              orientation="left"
              tickFormatter={formatNumber}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatNumber}
            />
            <Tooltip formatter={formatNumber} />
            <Legend onClick={handleLegendClick} />
            {lineVisibility.opening_usd && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="opening_usd"
                stroke="#8884d8"
                name="Opening USD"
                dot={false}
              />
            )}
            {lineVisibility.closing_usd && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="closing_usd"
                stroke="#82ca9d"
                name="Closing USD"
                dot={false}
              />
            )}
            {lineVisibility.opening_lbp && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="opening_lbp"
                stroke="#ffc658"
                name="Opening LBP"
                dot={false}
              />
            )}
            {lineVisibility.closing_lbp && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="closing_lbp"
                stroke="#ff7300"
                name="Closing LBP"
                dot={false}
              />
            )}
            <Brush dataKey="date" height={30} stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Similar Card components for other charts with filteredChartData */}
      {/* Adjusted to use dual Y-axes to handle differences in amounts */}

      {/* Payments Over Time Chart */}
      <Card
        title="Payments Over Time"
        style={{ marginTop: 20, marginBottom: 20 }}
      >
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={filteredChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis
              yAxisId="left"
              orientation="left"
              tickFormatter={formatNumber}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatNumber}
            />
            <Tooltip formatter={formatNumber} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="payments_usd"
              stroke="#8884d8"
              name="Payments USD"
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="payments_lbp"
              stroke="#82ca9d"
              name="Payments LBP"
              dot={false}
            />
            <Brush dataKey="date" height={30} stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Add other charts similarly, ensuring to use dual Y-axes and line visibility toggles */}

      <Table
        loading={isLoading}
        scroll={{ x: true }}
        dataSource={transactions}
        columns={transactionsColumns}
        rowKey="id"
      />

      {/* Payment Modal */}
      {/* Add your payment modal here */}

      {/* Conversion Modal */}
      {/* Add your conversion modal here */}

      <Divider />

      <Table
        loading={isLoading}
        scroll={{ x: true }}
        dataSource={credits}
        columns={creditsColumns}
        rowKey="id"
        title={() => <Typography.Title level={5}>Credits</Typography.Title>}
      />
      <Divider />

      <Table
        loading={isLoading}
        scroll={{ x: true }}
        dataSource={payments}
        columns={paymentsColumns}
        rowKey="id"
        title={() => <Typography.Title level={5}>Payments</Typography.Title>}
      />
      <Divider />

      <Table
        loading={isLoading}
        scroll={{ x: true }}
        dataSource={dailyBalances}
        columns={dailyBalancesColumns}
        rowKey="id"
        title={() => (
          <Typography.Title level={5}>Daily Balances</Typography.Title>
        )}
        expandable={{
          expandedRowRender,
          rowExpandable: (record) => {
            const dailyCredits = credits.filter(
              (credit) => credit.date === record.date
            );
            const dailyPayments = payments.filter(
              (payment) => payment.date === record.date
            );
            return dailyCredits.length > 0 || dailyPayments.length > 0;
          },
        }}
      />
      <Divider />

      <Table
        loading={isLoading}
        scroll={{ x: true }}
        dataSource={sales}
        columns={salesColumns}
        rowKey="id"
        title={() => <Typography.Title level={5}>Sales</Typography.Title>}
      />
    </>
  );
};

export default TransactionTable;
