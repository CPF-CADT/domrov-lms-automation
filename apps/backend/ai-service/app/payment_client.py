from dataclasses import dataclass
import requests


@dataclass(frozen=True)
class CreditReservation:
    approved: bool
    reservation_id: str = ""


class PaymentServiceClient:
    """Payment boundary. It never imports or queries Payment persistence."""

    def __init__(self, base_url: str, service_token: str = "", timeout: float = 5.0):
        self.base_url = base_url.rstrip("/")
        self.service_token = service_token
        self.timeout = timeout

    def _headers(self, idempotency_key: str) -> dict[str, str]:
        headers = {"Idempotency-Key": idempotency_key}
        if self.service_token:
            headers["Authorization"] = f"Bearer {self.service_token}"
        return headers

    def reserve(self, user_id: str, reference_id: str, amount: int = 1) -> CreditReservation:
        response = requests.post(
            f"{self.base_url}/credits/reservations",
            json={"userId": user_id, "referenceId": reference_id, "amount": amount},
            headers=self._headers(reference_id),
            timeout=self.timeout,
        )
        response.raise_for_status()
        payload = response.json()
        return CreditReservation(payload.get("status") == "reserved", str(payload.get("reservationId", "")))

    def commit(self, reservation_id: str, reference_id: str) -> None:
        requests.post(
            f"{self.base_url}/credits/reservations/{reservation_id}/commit",
            headers=self._headers(reference_id),
            timeout=self.timeout,
        ).raise_for_status()

    def release(self, reservation_id: str, reference_id: str) -> None:
        requests.post(
            f"{self.base_url}/credits/reservations/{reservation_id}/release",
            headers=self._headers(reference_id),
            timeout=self.timeout,
        ).raise_for_status()
