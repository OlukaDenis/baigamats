import React, { useState } from 'react';
import { LogBox, StyleSheet, View } from 'react-native';
import { HorecaApp } from '@horeca/HorecaApp';
import { SaccoApp } from '@sacco/SaccoApp';
import { env } from '@shared/config/env';

LogBox.ignoreAllLogs();

interface AppProps {
  appVariant?: 'sacco' | 'horeca';
}

export function App(props?: AppProps) {
  const initialVariant = props?.appVariant ?? env.APP_VARIANT;
  const [activeVariant] = useState<'sacco' | 'horeca'>(initialVariant);

  return (
    <View style={styles.container}>
      {activeVariant === 'horeca' ? <HorecaApp /> : <SaccoApp />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
