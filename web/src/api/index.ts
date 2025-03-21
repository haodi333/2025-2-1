const BASE_URL = 'http://127.0.0.1:5000'

export function upload(formData: FormData, targetMin: number | null, targetMax: number | null) {
    if (targetMin !== null) {
        formData.append('target_min', targetMin.toString());
    }
    if (targetMax !== null) {
        formData.append('target_max', targetMax.toString());
    }
    return fetch(BASE_URL + '/upload', {
        method: 'POST',
        body: formData,
    }).then((res) => res.blob())
}