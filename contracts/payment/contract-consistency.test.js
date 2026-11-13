const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const contractPath = __dirname + '/openapi.yaml';
const contract = fs.readFileSync(contractPath, 'utf8');
const refundPath = contract.slice(contract.indexOf('  /wallet/refund:'), contract.indexOf('  /credits/reservations:'));

test('refund contract matches the payment service controller boundary', () => {
  const controller = fs.readFileSync(__dirname + '/../../apps/backend/payment-service/src/controllers.ts', 'utf8');

  assert.match(refundPath, /operationId: refundWalletCredits/);
  assert.match(refundPath, /serviceAuth/);
  assert.match(refundPath, /\$ref: '#\/components\/parameters\/IdempotencyKey'/);
  assert.match(refundPath, /\$ref: '#\/components\/schemas\/RefundCreditsRequest'/);
  assert.match(refundPath, /\$ref: '#\/components\/schemas\/RefundCreditsResponse'/);
  assert.match(controller, /@Post\('wallet\/refund'\)/);
  assert.match(controller, /@UseGuards\(ServiceAuthGuard\)/);
  assert.match(controller, /body: \{ userId: string; amount: number; referenceId: string \}/);
});
