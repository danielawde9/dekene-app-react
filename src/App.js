// src/components/App.js
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import MainScreen from "./components/MainScreen";
import "./App.css";
import { Flex, Layout } from "antd";
import { Content } from "antd/es/layout/layout";
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const App = () => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchUser(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUser = async (session) => {
    if (session) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", session.user.email)
        .single();

      if (error) {
        console.error("Error fetching user:", error);
      } else {
        setUser(data);
      }
    }
  };

  if (!session || !user) {
    return (
      <Layout className="layout">
        <Flex vertical style={{ padding: "0 50px" }}>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={["google"]}
            showLinks={false}
          />
        </Flex>
      </Layout>
    );
  } else {
    return <MainScreen user={user} />;
  }
};

export default App;
