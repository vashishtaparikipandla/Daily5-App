import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function PhotoPicker({ photos, onChange, maxPhotos = 2 }: Props) {
  const colors = useColors();

  async function add() {
    if (photos.length >= maxPhotos) return;
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access to attach images.');
        return;
      }
    }
    Alert.alert('Add photo', 'Choose source', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Gallery', onPress: pickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function takePhoto() {
    if (Platform.OS === 'web') return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onChange([...photos, result.assets[0].uri]);
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onChange([...photos, result.assets[0].uri]);
    }
  }

  function remove(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.row}>
      {photos.map((uri, i) => (
        <View key={i} style={styles.photoWrap}>
          <Image source={{ uri }} style={styles.photo} />
          <TouchableOpacity style={[styles.removeBtn, { backgroundColor: colors.foreground }]} onPress={() => remove(i)}>
            <Ionicons name="close" size={10} color={colors.background} />
          </TouchableOpacity>
        </View>
      ))}
      {photos.length < maxPhotos && (
        <TouchableOpacity
          onPress={add}
          style={[styles.addBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
          activeOpacity={0.75}
        >
          <Ionicons name="camera-outline" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  photoWrap: { position: 'relative' },
  photo: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#eee' },
  removeBtn: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 56, height: 56, borderRadius: 8,
    borderWidth: 1, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
});
