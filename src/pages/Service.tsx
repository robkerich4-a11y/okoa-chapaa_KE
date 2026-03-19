import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  CheckCircle,
  Loader2,
  Smartphone,
  Home,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const BACKEND_URL = "https://pkurui-backend-1.onrender.com";

interface LoanData {
  name: string;
  phone_number: string;
  id_number: string;
  loan_type: string;
  loan_amount: number;
  processing_fee: number;
}

type PaymentStatus = "idle" | "initiating" | "pending" | "success" | "failed";

const TILL_NUMBER = "5284116";
const RECEIVER_NAME = "gedion kipkoech";

const Service = () => {
  const navigate = useNavigate();
  const [loanData, setLoanData] = useState<LoanData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");

  const [manualFlow, setManualFlow] = useState(false);
  const [mpesaMessage, setMpesaMessage] = useState("");

  useEffect(() => {
    const data = sessionStorage.getItem("myLoan");
    if (!data) {
      navigate("/apply");
      return;
    }

    const parsed = JSON.parse(data);
    if (!parsed.loan_amount || !parsed.processing_fee) {
      navigate("/apply");
      return;
    }

    setLoanData(parsed);
  }, [navigate]);

  const formatCurrency = (amount: number) =>
    `Ksh ${amount.toLocaleString("en-KE")}`;

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, "");

    if (cleaned.startsWith("0")) {
      cleaned = "254" + cleaned.slice(1);
    }

    if (!cleaned.startsWith("254")) {
      cleaned = "254" + cleaned;
    }

    return cleaned;
  };

  const initiateSTKPush = async () => {
    if (!loanData) return;

    setPaymentStatus("initiating");

    try {
      const response = await fetch(`${BACKEND_URL}/api/stk-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formatPhoneNumber(loanData.phone_number),
          amount: loanData.processing_fee,
          reference: `PROC_${Date.now()}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate STK push");
      }

      setPaymentStatus("pending");
      toast.success("Check your phone for the M-Pesa prompt!");
    } catch (err) {
      setPaymentStatus("failed");
      toast.error("STK failed. Use Till option instead.");
      setManualFlow(true);
    }
  };

  /* ================= VALIDATION ================= */

  const validateMpesaMessage = () => {
    if (!loanData) return false;

    const msg = mpesaMessage.toLowerCase();

    const amountMatch = msg.includes(
      loanData.processing_fee.toString()
    );

    const nameParts = RECEIVER_NAME.split(" ");
    const nameMatch = nameParts.every((part) => msg.includes(part));

    if (amountMatch && nameMatch) {
      setPaymentStatus("success");
      toast.success("Payment verified successfully!");

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);

      return true;
    }

    toast.error("Message does not match payment details.");
    return false;
  };

  const copyTill = () => {
    navigator.clipboard.writeText(TILL_NUMBER);
    toast.success("Till number copied!");
  };

  if (!loanData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalRepayment = Math.round(loanData.loan_amount * 1.1);

  /* ================= OVERLAY ================= */

  if (
    paymentStatus === "initiating" ||
    paymentStatus === "pending" ||
    paymentStatus === "success"
  ) {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex flex-col items-center justify-center p-6 text-center">
        {paymentStatus === "initiating" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-xl font-semibold">Initiating payment…</p>
          </>
        )}

        {paymentStatus === "pending" && (
          <>
            <Smartphone className="w-14 h-14 text-primary mb-4 animate-bounce" />
            <p className="text-xl font-semibold">Check your phone</p>

            <Button
              variant="outline"
              onClick={() => setManualFlow(true)}
              className="mt-6"
            >
              STK Delayed? Use Till Instead
            </Button>
          </>
        )}

        {paymentStatus === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-primary mb-4" />
            <p className="text-xl font-semibold">Payment successful</p>
          </>
        )}
      </div>
    );
  }

  /* ================= MAIN UI ================= */

  return (
    <div className="min-h-screen bg-background p-5">
      <div className="max-w-[500px] mx-auto">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 text-primary font-bold text-3xl mb-2">
            <Zap className="w-7 h-7" />
            Okoa Chapaa
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow border">
          <Row label="Applicant" value={loanData.name} />
          <Row label="Amount" value={formatCurrency(loanData.processing_fee)} />

          <Button
            onClick={initiateSTKPush}
            className="w-full mt-6 py-6 text-lg"
          >
            Pay with M-Pesa
          </Button>

          {/* ================= MANUAL FLOW ================= */}

          {manualFlow && (
            <div className="mt-6 space-y-4 border-t pt-6">
              <p className="font-semibold text-center">
                Pay via Till Number
              </p>

              <div className="flex items-center justify-between bg-accent p-3 rounded-xl">
                <span className="font-bold text-lg">{TILL_NUMBER}</span>
                <Button size="sm" onClick={copyTill}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Go to M-Pesa → Lipa na M-Pesa → Buy Goods → Enter Till Number
              </p>

              <textarea
                placeholder="Paste M-Pesa message here..."
                className="w-full border rounded-xl p-3 text-sm"
                rows={4}
                value={mpesaMessage}
                onChange={(e) => setMpesaMessage(e.target.value)}
              />

              <Button
                onClick={validateMpesaMessage}
                className="w-full"
              >
                Confirm Payment
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between py-1">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

export default Service;