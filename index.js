const Promise = require('./promise');

function add() {
    let i = 1;
    i++;
    return new Promise((resolve, reject) => {
        resolve(i);
    })
}
add().then(value => {
    console.log(value);
})