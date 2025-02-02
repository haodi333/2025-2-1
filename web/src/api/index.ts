const BASE_URL = 'http://127.0.0.1:5000'

export function upload(formData: FormData) {
    return fetch(BASE_URL + '/upload', {
        method: 'POST',
        body: formData,
    }).then((res) => res.blob())
}