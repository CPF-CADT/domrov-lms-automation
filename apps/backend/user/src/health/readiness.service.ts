import { BeforeApplicationShutdown, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Observable, Subscription } from 'rxjs';

@Injectable()
export class ReadinessService implements BeforeApplicationShutdown, OnApplicationShutdown {
  private rabbitMqConnected = false;
  private stopping = false;
  private subscription?: Subscription;

  observeRabbitMq(status: Observable<string>) {
    this.subscription?.unsubscribe();
    this.subscription = status.subscribe((value) => {
      this.rabbitMqConnected = value === 'connected' || value === 'unblocked';
    });
  }

  get rabbitMqReady() { return this.rabbitMqConnected && !this.stopping; }

  beforeApplicationShutdown() { this.stopping = true; }
  onApplicationShutdown() { this.subscription?.unsubscribe(); }
}
