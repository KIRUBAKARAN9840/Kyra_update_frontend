import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, Modal } from 'react-native';
import { CameraView, Camera } from 'expo-camera';

export default function QRCodeScanner({ isVisible, onClose, onCodeScanned }) {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        const getCameraPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };
        getCameraPermissions();
    }, []);

    const handleBarcodeScanned = ({ type, data }) => {
        setScanned(true);
        onCodeScanned(type, data);
        onClose();
    };

    if (hasPermission === null) {
        return <Text>Requesting for camera permission</Text>;
    }
    if (hasPermission === false) {
        return <Text>No access to camera</Text>;
    }

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ['qr', 'pdf417'],
                    }}
                    style={StyleSheet.absoluteFillObject}
                />
                {scanned && (
                    <View style={styles.buttonContainer}>
                        <Button title="Scan Again" onPress={() => setScanned(false)} />
                        <Button title="Close" onPress={onClose} />
                    </View>
                )}
                {!scanned && (
                    <Button title="Cancel" onPress={onClose} style={styles.closeButton} />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
    },
});
