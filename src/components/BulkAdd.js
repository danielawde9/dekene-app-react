import { createClient } from "@supabase/supabase-js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const bulkInsertTransactions = async () => {
  const withdrawalTransactions = [
    {"amount_usd": 100.0, "amount_lbp": 8830000.0, "person": null, "type": "withdrawal"},
  ];

  const paymentTransactions = [
    {"amount_usd": 0.0, "amount_lbp": 0.0, "person": null, "type": "payment"},
  ];

  const saleTransactions = [
    {"amount_usd": 0.0, "amount_lbp": 0.0, "person": null, "type": "sale"},
  ];

  try {
    const { error: withdrawalError } = await supabase
      .from("daniel")
      .insert(withdrawalTransactions);

    if (withdrawalError) throw withdrawalError;

    const { error: paymentError } = await supabase
      .from("payments")
      .insert(paymentTransactions);

    if (paymentError) throw paymentError;

    const { error: saleError } = await supabase
      .from("sales")
      .insert(saleTransactions);

    if (saleError) throw saleError;

    toast.success("Transactions inserted successfully!");
  } catch (error) {
    toast.error("Error inserting transactions: " + error.message);
  }
};

export default bulkInsertTransactions;
