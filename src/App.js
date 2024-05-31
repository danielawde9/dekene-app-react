// src/components/App.js
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import MainScreen from "./components/MainScreen";
import "./App.css";
import { Card, Flex, Layout } from "antd";
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
        <Flex
          vertical
          align="center"
          justify="center"
          style={{ height: "100vh" }}
        >
          <Card style={{ maxWidth: 500, width: 500 }}>
            <Flex vertical style={{ padding: "0 50px" }}>
              <Flex align="center" justify="center">
                <img alt="logo" src="./assets/logo.png" />
              </Flex>
              <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                providers={["google"]}
                showLinks={false}
              />
            </Flex>
          </Card>
        </Flex>
      </Layout>
    );
  } else {
    return <MainScreen user={user} />;
  }
};

export default App;
