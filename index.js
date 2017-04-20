'use strict';
require('es6-promise').polyfill();

const request = require('request');
const cheerio = require('cheerio');

const urlBase = 'http://globoesporte.globo.com/futebol/brasileirao-serie-';
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/601.3.9 (KHTML, like Gecko) Version/9.0.2 Safari/601.3.9';

exports.rodadaAtual = function(serie) {
  return new Promise(function(accept, error) {
    var options = {
      url:  urlBase + serie,
      headers: {
        'User-Agent': userAgent
      }
    };
    request(options, function(error, response, html) {
      if(!error) {

        var $ = cheerio.load(html);
        var lista = [];

        $('.lista-de-jogos-conteudo li').each(function() {
          var rodada = {};
          var item = $(this);
          rodada.mandante = item.find('.placar-jogo-equipes').find('.placar-jogo-equipes-mandante').find('.placar-jogo-equipes-sigla').attr('title');
          rodada.placarMandante = item.find('.placar-jogo-equipes').find('.placar-jogo-equipes-placar').find('.placar-jogo-equipes-placar-mandante').text();
          rodada.visitante = item.find('.placar-jogo-equipes').find('.placar-jogo-equipes-visitante').find('.placar-jogo-equipes-sigla').attr('title');
          rodada.placarVisitante = item.find('.placar-jogo-equipes').find('.placar-jogo-equipes-placar').find('.placar-jogo-equipes-placar-visitante').text();
          if(!rodada.placarMandante) rodada.placarMandante = 0;
          if(!rodada.placarVisitante) rodada.placarVisitante = 0;
          lista.push(rodada);
        });
        accept(lista);
      } else {
        error({ error:"Não foi possível retornar as informações!" });
      }
    });
  });
};

exports.tabela = function(serie) {
  return new Promise(function(accept, error) {
    var options = {
      url: urlBase + serie,
      headers: {
        'User-Agent': userAgent
      }
    };
    request(options, function(error, response, html) {
      if(!error) {

        var $ = cheerio.load(html);
        var lista = [];

        $('.tabela-times tbody tr').each(function() {
          var item = $(this);
          var time = {};
          time.nome = item.find('.tabela-times-time-link').attr('title');
          lista.push(time);
        });
        var x = 0;
        $('.tabela-pontos tbody tr').each(function() {
          var item = $(this);
          lista[x].pontos = item.find('.tabela-pontos-ponto').text();
          lista[x].jogos = item.find('.tabela-pontos-ponto').next().text();
          lista[x].vitorias = item.find('.tabela-pontos-ponto').next().next().text();
          lista[x].empates = item.find('.tabela-pontos-ponto').next().next().next().text();
          lista[x].derrotas = item.find('.tabela-pontos-ponto').next().next().next().next().text();
          lista[x].golsPro = item.find('.tabela-pontos-ponto').next().next().next().next().next().text();
          lista[x].golsContra = item.find('.tabela-pontos-ponto').next().next().next().next().next().next().text();
          lista[x].saldoGols = item.find('.tabela-pontos-ponto').next().next().next().next().next().next().next().text();
          lista[x].percentual = item.find('.tabela-pontos-ponto').next().next().next().next().next().next().next().next().text();
          x++;
        });
        accept(lista);
      } else {
        error({ error:"Não foi possível retornar as informações!" });
      }
    });
  });
};
