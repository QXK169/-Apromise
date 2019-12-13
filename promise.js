/**
 *  resolvePromise 用来处理then方法返回结果包装成promsie 方便链式调用
 * @param {*} promise  then方法执行产生的promise 方便链式调用
 * @param {*} x  then方法执行完成成功回调过着失败后回调的result
 * @param {*} resolve 返回的promise的resolve方法,用来更改promsie最后的状态
 * @param {*} reject 返回的promise的reject方法 用来更改promise最后的状态
 */

function resolvePromise(promise, x, resolve, reject) {
    //  首先判断x和promise是否同一引用 如果是 那么就用一个类型错误作为promise的失败原因
    if (promise === x) return reject(new TypeError('循环引用'));
    //called用来记录peomise状态的改变,一旦改变了,就不允许 再改成其他状态
    let called;
    if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
        // 如果x是一个对象或者函数 那么就有可能是promise 需要注意null typeof也是 object
        // 先获取x中的then 这一步发生异常, 那么就直接把异常reject
        try {
            let then = x.then;
            if (typeof then === 'function') {
                //  如果then是一个函数 那就调用then,把成功回调和失败回调传进去,如果x是个promise
                then.call(x, y => {
                    if (called) return;
                    called = true;
                    resolvePromise(promise, y, resolve, reject);
                }, err => {
                    if (called) return;
                    called = true;
                    reject(err);
                })
            } else {
                // 第二次修改
                if (called) return;
                called = true;
                resolve(x);
            }
        } catch (err) {
            if (called) return;
            called = true;
            reject(err);
        }
    } else {
        // 如果是个普通值直接返回该值
        resolve(x);
    }
}
class APromise {
    constructor(fn) {
        this.state = 'pending'; //状态,初始化state为pending
        this.value = null; //成功结果,返回一般都是null
        this.reason = null; //失败的原因,返回一般都是null
        this.resolvedCb = [];  // 成功执行函数队列
        this.rejcetCb = []; // 失败执行函数队列
        // success 成功
        let resolve = value => {
            if (this.state === 'pending') {
                // state change 
                this.state = 'fulfilled';
                // 储存成功的值
                this.value = value;
                // 一旦成功,调用函数队列
                this.resolvedCb.forEach(fn => fn())
            }
        }
        // faile
        let reject = reason => {
            if (this.state === 'pending') {
                // state change 
                this.state = 'rejected';
                // 储存失败信息
                this.reason = reason;
                // 一旦成功,调用函数队列
                this.rejcetCb.forEach(fn => fn());
            }
        }
        try {
            fn(resolve, reject);
        } catch (err) {
            reject(err);
        }
    }
    // 静态方法 仅供对象本身调用
    static resolve(val) {
        return new APromise((resolve, reject) => {
            resolve(val);
        })
    }
    static reject(val) {
        return new APromise((resolve, reject) => {
            reject(val);
        })
    }
    // all 方法(获取所有的promise, 执行then, 把结果放在数组,一起返回)
    static all(promiseArr) {
        return new APromise((resolve, reject) => {
            let arr = [];
            let i = 0;
            function processData(index, data) {
                arr[index] = data;
                if (++i == promiseArr.length) {
                    resolve(arr);
                }
            }
            for (let i = 0; i < promiseArr.length; i++) {
                let promiseItem = typeof promiseArr[i] === 'object' ? promiseArr[i] : APromise.resolve(promiseArr[i]);
                promiseItem.then(data => {
                    processData(i, data);
                }, reject);
            }
        })
    }
    static race(promiseArr) {
        return new APromise((resolve, reject) => {
            for (let i = 0, length = promiseArr.length; i < length; i++) {
                let promiseItem = typeof promiseArr[i] === 'object' ? promiseArr[i] : APromise.resolve(promiseArr[i]);
                promiseItem.then(resolve, reject);
            }
        })
    }
    // 语法糖
    static deferred() {
        let dfd = {};
        dfd.promise = new APromise((resolve, reject) => {
            dfd.resolve = resolve;
            dfd.reject = reject;
        })
        return dfd;
    }
    catch(onRejected) {
        return this.then(null, onRejected);
    }
    then(onfulfilled, onRejected) {
        // onfulfilled then方法成功回调
        // onRejected  then方法失败回调
        // 如果onfulfilled不是函数,就用默认函数替代,以便达到值穿透
        onfulfilled = typeof onfulfilled === 'function' ? onfulfilled : value => value;
        // 如果onRejected不是函数,就用默认函数替代,以便达到值穿透
        onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err };
        let promise2 = new APromise((resolve, reject) => {
            //当状态是fulfilled时执行onFulfilled函数
            if (this.state === 'fulfilled') {
                // 异步实现
                setTimeout(() => {
                    try {
                        // x 是执行成功回调的结果
                        let x = onfulfilled(this.value);
                        // 调用resolvePromise函数,根据x的值,来决定promise2的状态
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (err) {
                        reject(err);
                    }
                }, 0)
            }
            //当状态是fulfilled时执行onFulfilled函数
            if (this.state === 'rejected') {
                setTimeout(() => {
                    try {
                        let x = onRejected(this.reason);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (err) {
                        reject(err)
                    }
                }, 0)
            }
            // 当状态为pending时, resolvedCb,rejcetCb 队列里面家函数
            if (this.state === 'pending') {
                this.resolvedCb.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onfulfilled(this.value);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (err) {
                            reject(err)
                        }
                    }, 0)
                })
                this.rejcetCb.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onRejected(this.reason);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (err) {
                            reject(err)
                        }
                    }, 0)
                })
            }
        })
        return promise2;
    }
}

module.exports = APromise
