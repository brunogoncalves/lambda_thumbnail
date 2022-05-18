const fs = require('fs');
const path = require('path');
const jimp = require('jimp');
const arr = require('rhinojs/support/arr');
const str = require('rhinojs/support/str');
const S3CLient = require('aws-sdk/clients/s3');

const __gerarThumbEnviar = async (s3, arquivo, bucket, nome, w = false, h = false) => {
    // Carregar prefixos
    const prefix_origem  = arr.get(process.env, 'THUMB_PREFIX_ORIGEM', 'produtos_originais/');
    const prefix_destino = arr.get(process.env, 'THUMB_PREFIX_DESTINO', 'produtos/');

    // Verificar se deve gerar thumb
    if ((w !== false) && (h !== false)) {
        var img = await jimp.read(arquivo.Body);
        img.resize(w, jimp.AUTO);
        img.cover(w, h, jimp.HORIZONTAL_ALIGN_CENTER | jimp.VERTICAL_ALIGN_MIDDLE);
        img.quality(75);

        var buffer = await img.getBufferAsync(arquivo.ContentType);
        var ext    = path.extname(nome);
        var dir    = path.dirname(nome);
        var key    = path.basename(nome, ext) + '_s' + String(w) + 'x' + String(h) + ext;
        key        = dir + '/' + key;
    } else {
        var buffer = arquivo.Body;
        var key    = nome;
    }

    console.log('STEP-CORTOU-IMAGEM');

    // Tratar prefixos
    key = str.replaceAll(prefix_origem, prefix_destino, key);

    // Enviar arquivo
    var data = { Body: buffer, Bucket : bucket, Key: key };
    await s3.putObject(data).promise();

    console.log('STEP-POSTOU-THUMB');
};

module.exports = (app) => {

    app.on('command.s3', async (cmd) => {
        console.log('S3 EVENTO');
        //console.log(JSON.stringify(cmd));

        // Verificar se é pasta de produtos
        const pasta_produtos  = arr.get(process.env, 'THUMB_PASTA_PRDUTOS', 'produtos_originais/');
        if (cmd.object.key.indexOf(pasta_produtos) < 0) {
            return false;
        }

        // Verificar se não é um thumb
        if (cmd.object.key.indexOf('_s') >= 0) {
            console.log('STEP-EH-UM-THUMB');
            return false;
        }

        // Baixar arquivo
        const s3 = new S3CLient({ region : 'sa-east-1', apiVersion : '2006-03-01' });
        var data = { Bucket : cmd.bucket.name, Key : cmd.object.key };
        const arquivo = await s3.getObject(data).promise();

        console.log('STEP-CARREGOU-ARQUIVO');

        // Enviar arquivo original
        //await __gerarThumbEnviar(s3, arquivo, cmd.bucket.name, cmd.object.key);

        // Enviar thumb das faixas
        const faixas = String(arr.get(process.env, 'THUMB_FAIXAS', '500x500')).split(',');
        for (var i = 0; i < faixas.length; i++) {
            var tams = faixas[i].split('x');
            var t_w  = Number(tams[0]);
            var t_h  = Number(tams[1]);

            await __gerarThumbEnviar(s3, arquivo, cmd.bucket.name, cmd.object.key, t_w, t_h);
        }
    });

};