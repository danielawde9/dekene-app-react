// import { toast } from "react-toastify";

// export const generateMockData = async () => {
//   const today = new Date();
//   const thirtyDaysAgo = new Date();
//   thirtyDaysAgo.setDate(today.getDate() - 30);

//   let currentDate = new Date(thirtyDaysAgo);
//   let previousClosingUSD = 1000  // Initial random opening balance in USD
//   let previousClosingLBP = 1500000  // Initial random opening balance in LBP

//   while (currentDate <= today) {
//     const dateString = currentDate.toISOString().split("T")[0];
//     const opening_usd = previousClosingUSD;
//     const opening_lbp = previousClosingLBP;

//     // Simulate random transactions for the day
//     const totalCreditsUSD = Array(3)
//       .fill(0)
//       .reduce((acc) => acc + Math.random() * 50 + 50, 0);
//     const totalCreditsLBP = Array(3)
//       .fill(0)
//       .reduce((acc) => acc + Math.random() * 500000 + 500000, 0);
//     const totalPaymentsUSD = Array(3)
//       .fill(0)
//       .reduce((acc) => acc + Math.random() * 50 + 50, 0);
//     const totalPaymentsLBP = Array(3)
//       .fill(0)
//       .reduce((acc) => acc + Math.random() * 500000 + 500000, 0);
//     const totalSalesUSD = Array(3)
//       .fill(0)
//       .reduce((acc) => acc + Math.random() * 50 + 50, 0);
//     const totalSalesLBP = Array(3)
//       .fill(0)
//       .reduce((acc) => acc + Math.random() * 500000 + 500000, 0);
//     const totalWithdrawalsUSD = Array(3)
//       .fill(0)
//       .reduce((acc) => acc + Math.random() * 50 + 50, 0);
//     const totalWithdrawalsLBP = Array(3)
//       .fill(0)
//       .reduce((acc) => acc + Math.random() * 500000 + 500000, 0);

//     const closing_usd =
//       opening_usd +
//       totalSalesUSD -
//       totalCreditsUSD -
//       totalPaymentsUSD +
//       totalWithdrawalsUSD;
//     const closing_lbp =
//       opening_lbp +
//       totalSalesLBP -
//       totalCreditsLBP -
//       totalPaymentsLBP +
//       totalWithdrawalsLBP;

//     // Insert daily balance
//     const { data: balanceData, error: balanceError } = await supabase
//       .from("dailybalances")
//       .insert([
//         {
//           date: dateString,
//           opening_usd,
//           opening_lbp,
//           closing_usd,
//           closing_lbp,
//           user_id: 1, // Assuming user ID 1 is valid
//         },
//       ]);

//     if (balanceError) {
//       toast.error("Error inserting daily balance: " + balanceError.message);
//       return;
//     }

//     // Insert random credits
//     for (let i = 0; i < 3; i++) {
//       const { error: creditError } = await supabase.from("credits").insert([
//         {
//           date: dateString,
//           amount_usd: Math.random() * 50 + 50, // Random value between 50 and 100
//           amount_lbp: Math.random() * 500000 + 500000, // Random value between 500,000 and 1,000,000
//           person: `Person ${i + 1}`,
//           user_id: 1,
//         },
//       ]);
//       if (creditError) throw creditError;
//     }

//     // Insert random payments
//     for (let i = 0; i < 3; i++) {
//       const { error: paymentError } = await supabase.from("payments").insert([
//         {
//           date: dateString,
//           amount_usd: Math.random() * 50 + 50, // Random value between 50 and 100
//           amount_lbp: Math.random() * 500000 + 500000, // Random value between 500,000 and 1,000,000
//           reference_number: `REF-${i + 1}`,
//           cause: `Payment cause ${i + 1}`,
//           user_id: 1,
//         },
//       ]);
//       if (paymentError) throw paymentError;
//     }

//     // Insert random sales
//     for (let i = 0; i < 3; i++) {
//       const { error: saleError } = await supabase.from("sales").insert([
//         {
//           date: dateString,
//           amount_usd: Math.random() * 50 + 50, // Random value between 50 and 100
//           amount_lbp: Math.random() * 500000 + 500000, // Random value between 500,000 and 1,000,000
//           user_id: 1,
//         },
//       ]);
//       if (saleError) throw saleError;
//     }

//     // Insert random withdrawals
//     for (let i = 0; i < 3; i++) {
//       const { error: withdrawalError } = await supabase
//         .from("withdrawals")
//         .insert([
//           {
//             date: dateString,
//             amount_usd: Math.random() * 50 + 50, // Random value between 50 and 100
//             amount_lbp: Math.random() * 500000 + 500000, // Random value between 500,000 and 1,000,000
//             user_id: 1,
//           },
//         ]);
//       if (withdrawalError) throw withdrawalError;
//     }

//     // Update previous closing balances for the next day
//     previousClosingUSD = closing_usd;
//     previousClosingLBP = closing_lbp;

//     currentDate.setDate(currentDate.getDate() + 1);
//   }

//   toast.success("Mock data generated successfully!");
// };
