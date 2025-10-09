import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentSettings() {
  const [paymentMethods, setPaymentMethods] = React.useState([
    { id: '1', type: 'card', last4: '4242', brand: 'Visa', isDefault: true },
    { id: '2', type: 'card', last4: '5555', brand: 'Mastercard', isDefault: false },
    { id: '3', type: 'paypal', email: 'user@example.com', isDefault: false },
  ]);

  const addPaymentMethod = () => {
    Alert.alert(
      'Add Payment Method',
      'Choose how you want to add a payment method',
      [
        { text: 'Credit Card', onPress: () => console.log('Add credit card') },
        { text: 'PayPal', onPress: () => console.log('Add PayPal') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const removePaymentMethod = (id: string) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(prev => prev.filter(method => method.id !== id));
          }
        },
      ]
    );
  };

  const setDefaultPayment = (id: string) => {
    setPaymentMethods(prev => 
      prev.map(method => ({
        ...method,
        isDefault: method.id === id
      }))
    );
  };

  const renderPaymentMethod = (method: any) => (
    <View key={method.id} style={styles.paymentMethod}>
      <View style={styles.paymentInfo}>
        <View style={styles.paymentIcon}>
          <Ionicons 
            name={method.type === 'card' ? 'card-outline' : 'logo-paypal'} 
            size={24} 
            color="#667EEA" 
          />
        </View>
        <View style={styles.paymentDetails}>
          {method.type === 'card' ? (
            <>
              <Text style={styles.paymentTitle}>{method.brand} •••• {method.last4}</Text>
              <Text style={styles.paymentSubtitle}>Credit Card</Text>
            </>
          ) : (
            <>
              <Text style={styles.paymentTitle}>PayPal</Text>
              <Text style={styles.paymentSubtitle}>{method.email}</Text>
            </>
          )}
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.paymentActions}>
        {!method.isDefault && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setDefaultPayment(method.id)}
          >
            <Text style={styles.actionText}>Set Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removePaymentMethod(method.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#E53E3E" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          
          {paymentMethods.map(renderPaymentMethod)}
          
          <TouchableOpacity style={styles.addButton} onPress={addPaymentMethod}>
            <Ionicons name="add-outline" size={24} color="#667EEA" />
            <Text style={styles.addButtonText}>Add Payment Method</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing Information</Text>
          
          <View style={styles.billingItem}>
            <Text style={styles.billingLabel}>Billing Address</Text>
            <Text style={styles.billingValue}>123 Main St, City, State 12345</Text>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.billingItem}>
            <Text style={styles.billingLabel}>Tax ID</Text>
            <Text style={styles.billingValue}>12-3456789</Text>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          
          <TouchableOpacity style={styles.historyButton}>
            <View style={styles.historyInfo}>
              <Text style={styles.historyTitle}>View Payment History</Text>
              <Text style={styles.historySubtitle}>See all your transactions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#718096" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.historyButton}>
            <View style={styles.historyInfo}>
              <Text style={styles.historyTitle}>Download Invoices</Text>
              <Text style={styles.historySubtitle}>Get PDF copies of your invoices</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#718096" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <TouchableOpacity style={styles.securityButton}>
            <View style={styles.securityInfo}>
              <Text style={styles.securityTitle}>Enable Two-Factor Authentication</Text>
              <Text style={styles.securitySubtitle}>Add extra security to your payments</Text>
            </View>
            <Ionicons name="shield-checkmark-outline" size={20} color="#667EEA" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.securityButton}>
            <View style={styles.securityInfo}>
              <Text style={styles.securityTitle}>Payment Limits</Text>
              <Text style={styles.securitySubtitle}>Set daily and monthly spending limits</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#718096" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 2,
  },
  paymentSubtitle: {
    fontSize: 14,
    color: '#718096',
  },
  defaultBadge: {
    backgroundColor: '#667EEA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667EEA',
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#667EEA',
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667EEA',
    marginLeft: 8,
  },
  billingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  billingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1,
  },
  billingValue: {
    fontSize: 14,
    color: '#718096',
    flex: 2,
    textAlign: 'right',
    marginRight: 12,
  },
  editButton: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667EEA',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 2,
  },
  historySubtitle: {
    fontSize: 14,
    color: '#718096',
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  securityInfo: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 2,
  },
  securitySubtitle: {
    fontSize: 14,
    color: '#718096',
  },
});


