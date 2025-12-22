import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const LevelUpModal = ({ visible, rank, onClose }) => {
    const scaleValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Hiệu ứng nảy (Spring Animation)
            Animated.spring(scaleValue, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            scaleValue.setValue(0);
        }
    }, [visible]);

    if (!rank) return null;

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                <Animated.View style={[styles.card, { transform: [{ scale: scaleValue }] }]}>
                    {/* Header: Ánh sáng tỏa ra */}
                    <View style={styles.glowContainer}>
                        <Text style={styles.icon}>{rank.icon}</Text>
                    </View>

                    <Text style={styles.title}>CHÚC MỪNG!</Text>
                    <Text style={styles.subTitle}>Bạn vừa thăng hạng lên</Text>
                    
                    <View style={styles.rankBadge}>
                        <Text style={styles.rankTitle}>{rank.title}</Text>
                    </View>

                    <Text style={styles.message}>"{rank.message}"</Text>

                    <TouchableOpacity style={styles.button} onPress={onClose}>
                        <Text style={styles.btnText}>TUYỆT VỜI! 🎉</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    card: { width: width * 0.85, backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    
    glowContainer: { marginBottom: 15, shadowColor: "#FFD700", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 30, elevation: 15 },
    icon: { fontSize: 80 },
    
    title: { fontSize: 28, fontWeight: '900', color: '#FF9500', marginBottom: 5, letterSpacing: 1 },
    subTitle: { fontSize: 16, color: '#666', marginBottom: 15 },
    
    rankBadge: { backgroundColor: '#FFD700', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 50, marginBottom: 20 },
    rankTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', textTransform: 'uppercase' },
    
    message: { fontSize: 15, textAlign: 'center', color: '#555', fontStyle: 'italic', marginBottom: 25, lineHeight: 22 },
    
    button: { backgroundColor: '#007AFF', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, width: '100%', alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default LevelUpModal;