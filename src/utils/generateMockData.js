import { supabase } from "@supabase/auth-ui-shared";
import { toast } from "react-toastify";

export const generateMockData = async () => {
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
