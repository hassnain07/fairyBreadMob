import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Upload, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';

export interface ProofFile {
  uri: string;
  name: string;
  type: 'image' | 'document';
  size?: number;
}

interface ProofPickerProps {
  onSelect: (file: ProofFile | undefined) => void;
  selectedFile?: ProofFile;
  selectedFileName?: string; // For backward compatibility
  prompt?: string;
  helper?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function ProofPicker({
  onSelect,
  selectedFile,
  selectedFileName,
  prompt = 'Please upload your payment receipt.',
  helper = 'Upload a screenshot or PDF of your bank transfer confirmation.',
  maxSizeMB = 10,
  disabled = false,
}: ProofPickerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayFile = selectedFile || selectedFileName;

  const handlePickImage = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileSizeMB = (asset.fileSize || 0) / 1024 / 1024;
        if (fileSizeMB > maxSizeMB) {
          setError(`File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`);
          return;
        }
        onSelect({
          uri: asset.uri,
          name: asset.fileName || `receipt-${Date.now()}.jpg`,
          type: 'image',
          size: asset.fileSize,
        });
      }
    } catch (err) {
      setError('Failed to pick image. Please try again.');
      console.error('Image picker error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileSizeMB = (asset.size || 0) / 1024 / 1024;
        if (fileSizeMB > maxSizeMB) {
          setError(`File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`);
          return;
        }
        onSelect({
          uri: asset.uri,
          name: asset.name,
          type: asset.name?.endsWith('.pdf') ? 'document' : 'image',
          size: asset.size,
        });
      }
    } catch (err) {
      setError('Failed to pick document. Please try again.');
      console.error('Document picker error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Prompt */}
      <Text style={[type.body, { color: colors.ink, marginBottom: space.sm }]}>
        {prompt}
      </Text>
      <Text style={[type.small, { color: colors.muted, marginBottom: space.lg }]}>
        {helper}
      </Text>

      {/* Selected file display */}
      {displayFile && (
        <View style={styles.selectedBox}>
          <Text style={[type.small, { color: colors.ink, flex: 1 }]} numberOfLines={1}>
            ✓ {typeof displayFile === 'string' ? displayFile : displayFile.name}
          </Text>
          {!disabled && (
            <TouchableOpacity
              onPress={() => onSelect(undefined)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Error banner */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={[type.small, { color: '#C0392B' }]}>{error}</Text>
        </View>
      )}

      {/* Upload buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.imageButton]}
          onPress={handlePickImage}
          disabled={loading || disabled}
        >
          {loading ? (
            <ActivityIndicator color={colors.pink} size="small" />
          ) : (
            <>
              <Upload size={16} color={colors.pink} />
              <Text style={[type.small, { color: colors.pink, marginLeft: space.sm }]}>
                Photo
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.documentButton]}
          onPress={handlePickDocument}
          disabled={loading || disabled}
        >
          {loading ? (
            <ActivityIndicator color={colors.ink} size="small" />
          ) : (
            <>
              <Upload size={16} color={colors.ink} />
              <Text style={[type.small, { color: colors.ink, marginLeft: space.sm }]}>
                PDF or Image
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: space.lg,
  },
  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9F8EF',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginBottom: space.lg,
    borderWidth: 1,
    borderColor: '#C9EBCE',
  },
  errorBox: {
    backgroundColor: '#FFF0E9',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginBottom: space.lg,
    borderWidth: 1,
    borderColor: '#FFD2B9',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  imageButton: {
    borderColor: colors.pink,
    backgroundColor: '#FFF0F5',
  },
  documentButton: {
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
});
