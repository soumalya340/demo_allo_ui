import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { encodeFunctionData } from 'viem';
registerHooks({resolve(specifier, context, next) {
  if (specifier === './board-api' && context.parentURL?.endsWith('/trade-api.ts')) return next('./board-api.ts', context);
  return next(specifier, context);
}});
const { tradeParams, tradeTransaction, tradeAbi } = await import('../app/lib/trade-api.ts');
const pool='0x1111111111111111111111111111111111111111';
const account='0x2222222222222222222222222222222222222222';
const amount={raw:'1',formatted:'0.000000000000000001'};
const makeQuote = side => ({chainId:97,approvals:[],transaction:{from:account,to:pool,value:side==='buy'?'1000000000000000000':'0',data:encodeFunctionData({abi:tradeAbi,functionName:side==='buy'?'buyExactIn':'sell',args:[1000000000000000000n,1n]})},quote:{quoteToken:{native:true},tax:amount,tokensOut:amount,minTokensOut:amount,quoteOut:amount,minQuoteOut:amount}});
test('buy and sell preserve input precision and map slippage to BPS',()=>{
 assert.equal(tradeParams('buy',pool,'0.123456789012345678','0.25',account).get('amountIn'),'0.123456789012345678');
 assert.equal(tradeParams('sell',pool,'12','1',account).get('tokenAmount'),'12');
 assert.equal(tradeParams('buy',pool,'1','0.25',account).get('slippageBps'),'25');
 for (const v of ['0','-1','1e3','1.0000000000000000001']) assert.throws(()=>tradeParams('buy',pool,v,'1',account));
 for (const v of ['-1','51','0.001']) assert.throws(()=>tradeParams('buy',pool,'1',v,account));
});
test('buy uses BNB value; sell sends no BNB and both preserve calldata',()=>{
 for (const side of ['buy','sell']) {
 const q=makeQuote(side);const tx=tradeTransaction(q,side,pool,account,'1');
 assert.equal(tx.value,side==='buy'?1000000000000000000n:0n);assert.equal(tx.data,q.transaction.data);assert.equal(tx.chainId,97);
 }
});
test('rejects mismatched network, account, pool, method, amount, and minimum',()=>{
 for(const modify of [q=>q.chainId=56,q=>q.transaction.from=pool,q=>q.transaction.to=account,q=>q.transaction.value='1',q=>q.quote.minTokensOut={...amount,raw:'2'},q=>q.approvals=[{}]]){
 const q=makeQuote('buy');modify(q);assert.throws(()=>tradeTransaction(q,'buy',pool,account,'1'));
 }
 assert.throws(()=>tradeTransaction(makeQuote('buy'),'sell',pool,account,'1'));
 assert.throws(()=>tradeTransaction(makeQuote('buy'),'buy',pool,account,'2'));
});
