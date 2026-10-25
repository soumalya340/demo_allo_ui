import test from 'node:test';
import assert from 'node:assert/strict';
import { walletLaunchTransaction } from '../app/lib/launch-transaction.ts';
const account = '0x1111111111111111111111111111111111111111';
const factory = '0x2222222222222222222222222222222222222222';
const result = () => ({chainId:97,approvals:[],quote:{quoteToken:{native:true}},transaction:{from:account,to:factory,data:'0x12345678',value:'2000000000000000'}});
test('maps exact native BNB value and calldata to a chain-97 wallet request',()=>{
 assert.deepEqual(walletLaunchTransaction(result(),account,97,factory),{account,chainId:97,to:factory,data:'0x12345678',value:2000000000000000n});
});
test('blocks wrong chain, changed wallet, unexpected factory and unsupported approvals',()=>{
 assert.throws(()=>walletLaunchTransaction(result(),account,1,factory),/chain 97/);
 const wrongChain=result();wrongChain.chainId=56;
 assert.throws(()=>walletLaunchTransaction(wrongChain,account,97,factory),/chain 97/);
 assert.throws(()=>walletLaunchTransaction(result(),factory,97,factory),/wallet changed/);
 assert.throws(()=>walletLaunchTransaction(result(),account,97,account),/factory/);
 const approvals=result();approvals.approvals=[{}];
 assert.throws(()=>walletLaunchTransaction(approvals,account,97,factory),/native BNB/);
});
test('rejects missing sender and malformed transaction fields',()=>{
 for(const patch of [{from:undefined},{data:'0x12'},{value:'-1'},{value:'1.2'},{to:'bad'}]){
  const r=result();Object.assign(r.transaction,patch);
  assert.throws(()=>walletLaunchTransaction(r,account,97,factory));
 }
});
