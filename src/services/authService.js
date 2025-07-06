import { useState, useEffect } from 'react';
import { authService } from './firebaseConfig';

export const useAuthState = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
};

export const signIn = async (email, password) => {
  try {
    const result = await authService.signInWithEmailAndPassword(email, password);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const signUp = async (email, password) => {
  try {
    const result = await authService.createUserWithEmailAndPassword(email, password);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  try {
    await authService.signOut();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};