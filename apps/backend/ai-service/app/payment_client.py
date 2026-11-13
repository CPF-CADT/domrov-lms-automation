from dataclasses import dataclass
import requests


@dataclass(frozen=True)
class CreditReservation:
    approved: bool
    reservation_id: str = ""


class PaymentServiceClient:
    """Payment boundary. It never imports or queries Payment persistence."""

    def __init__(self, base_url: str, timeout: float = 5.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def reserve(self, user_id: str, reference_id: str, amount: int = 1) -> CreditReservation:
        response = requests.post(
            f"{self.base_url}/credits/reserve",
            json={"userId": user_id, "referenceId": reference_id, "amount": amount},
            headers={"Idempotency-Key": reference_id},
            timeout=self.timeout,
        )
        response.raise_for_status()
        payload = response.json()
        return CreditReservation(bool(payload.get("approved")), str(payload.get("reservationId", "")))

    def commit(self, reservation_id: str, reference_id: str) -> None:
        requests.post(f"{self.base_url}/credits/commit", json={"reservationId": reservation_id, "referenceId": reference_id}, timeout=self.timeout).raise_for_status()

    def release(self, reservation_id: str, reference_id: str) -> None:
        requests.post(f"{self.base_url}/credits/release", json={"reservationId": reservation_id, "referenceId": reference_id}, timeout=self.timeout).raise_for_status()
