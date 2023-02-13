const reorderArray = (array, item, to, from = undefined) => {
  const resArray = []
  let fromClone = from

  for (let i = 0; i < array.length; i += 1) {
    resArray.push(array[i])
  }

  if (from === undefined) {
    resArray.push(item)
    fromClone = from || resArray.length - 1
  }

  const dragged = resArray.splice(fromClone, 1)[0]
  resArray.splice(to, 0, dragged)
  return resArray
}

module.exports = reorderArray
