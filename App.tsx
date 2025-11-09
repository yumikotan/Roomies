import React, {useEffect} from 'react';
import {View, Text} from 'react-native';
import firestore from '@react-native-firebase/firestore';

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        await firestore().collection('test').add({created: Date.now()});
        console.log('✅ Firestore write succeeded');
      } catch (e) {
        console.error('❌ Firestore failed:', e);
      }
    })();
  }, []);
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>🔥 Firebase Test</Text>
    </View>
  );
}
