// Teste para enviar email de criação de conta
const testSendAccountCreationEmail = async () => {
  try {
    const response = await fetch('https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/send-password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A'
      },
      body: JSON.stringify({
        email: 'milionariamarca0@gmail.com',
        customerName: 'Abdul silva',
        isNewAccount: true,
        orderId: 'TEST-123'
      })
    });

    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};

testSendAccountCreationEmail();