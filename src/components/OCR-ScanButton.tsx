import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

const GOOGLE_CLOUD_VISION_API_KEY = process.env.EXPO_PUBLIC_VISION_API_KEY ?? "";
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`;

export type OcrResult = {
  rawText: string;
  blocks: string[];
  rawResponse: object;
};

type Props = {
  onResult: (result: OcrResult) => void;
  onError?: (error: Error) => void;
};

// base64 dostajemy bezpośrednio z kamery/galerii — bez FileSystem
async function runOcr(base64: string): Promise<OcrResult> {
  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
      },
    ],
  };

  const response = await fetch(VISION_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  console.log("HTTP status:", response.status);
  console.log("RAW RESPONSE:", JSON.stringify(json, null, 2));

  if (!response.ok) {
    throw new Error(
      `Vision API error ${response.status}: ${json.error?.message ?? "unknown"}`
    );
  }

  const response0 = json.responses?.[0];

  if (response0?.error) {
    throw new Error(`Vision API error: ${response0.error.message}`);
  }

  const rawText: string =
    response0?.fullTextAnnotation?.text ??
    response0?.textAnnotations?.[0]?.description ??
    "";

  const blocks: string[] =
    response0?.fullTextAnnotation?.pages
      ?.flatMap((p: any) => p.blocks)
      ?.map(
        (b: any) =>
          b.paragraphs
            ?.flatMap((par: any) => par.words)
            ?.map((w: any) => w.symbols?.map((s: any) => s.text).join(""))
            ?.join(" ") ?? ""
      ) ?? [];

  return { rawText, blocks, rawResponse: json };
}

export default function OcrScanButton({ onResult, onError }: Props) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleError = (err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    onError ? onError(error) : Alert.alert("Błąd OCR", error.message);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Brak uprawnień", "Potrzebny jest dostęp do galerii.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
      base64: true, // ← base64 bezpośrednio, bez FileSystem
    });

    if (!result.canceled && result.assets[0]?.base64) {
      await processImage(result.assets[0].base64);
    }
  };

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert("Brak uprawnień", "Potrzebny jest dostęp do kamery.");
        return;
      }
    }
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: true, // ← base64 bezpośrednio, bez FileSystem
    });
    setShowCamera(false);
    if (photo?.base64) {
      await processImage(photo.base64);
    }
  };

  const processImage = async (base64: string) => {
    setLoading(true);
    try {
      const result = await runOcr(base64);
      onResult(result);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    Alert.alert("Skanuj paragon", "Wybierz źródło zdjęcia", [
      { text: "Kamera", onPress: openCamera },
      { text: "Galeria", onPress: pickFromGallery },
      { text: "Anuluj", style: "cancel" },
    ]);
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={handlePress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>📷 Skanuj paragon</Text>
        )}
      </Pressable>

      <Modal
        visible={showCamera}
        animationType="slide"
        onRequestClose={() => setShowCamera(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />

          <View style={styles.cameraControls}>
            <Pressable style={styles.cancelButton} onPress={() => setShowCamera(false)}>
              <Text style={styles.cancelText}>✕ Anuluj</Text>
            </Pressable>
            <Pressable style={styles.shutterButton} onPress={takePicture}>
              <View style={styles.shutterInner} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#6200ea",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 180,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
  },
  cancelButton: {
    padding: 12,
  },
  cancelText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});