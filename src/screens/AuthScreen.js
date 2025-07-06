import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  TextInput, 
  Button, 
  Card,
  Title,
  Paragraph 
} from 'react-native-paper';
import { signIn, signUp } from '../services/authService';

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password);

    if (!result.success) {
      Alert.alert('Error', result.error);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Title>
            <Paragraph style={styles.subtitle}>
              {isSignUp 
                ? 'Sign up to start reading' 
                : 'Sign in to continue reading'
              }
            </Paragraph>

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              mode="outlined"
            />

            <Button
              mode="contained"
              onPress={handleAuth}
              loading={loading}
              style={styles.button}
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>

            <Button
              mode="text"
              onPress={() => setIsSignUp(!isSignUp)}
              style={styles.switchButton}
            >
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : "Don't have an account? Sign Up"
              }
            </Button>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    padding: 20,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 8,
  },
  switchButton: {
    marginTop: 16,
  },
});

export default AuthScreen;