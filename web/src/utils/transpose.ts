export function transpose<T>(data: Array<Array<T>>) {
    return data[0].map((_, colIndex) => data.map((row) => row[colIndex]));
}