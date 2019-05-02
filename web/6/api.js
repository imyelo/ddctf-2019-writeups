const got = require('got')
const { CookieJar } = require('tough-cookie')
const querystring = require('querystring')
const op = require('object-path')

const ENDPOINT = 'http://117.51.147.155:5050/ctf/api'

class Api {
  constructor (endpoint = ENDPOINT) {
    this.jar = new CookieJar()
    this.got = got.extend({
      baseUrl: endpoint,
      cookieJar: this.jar,
      retry: 5,
      hooks: {
        afterResponse: [
          (response) => {
            let body
            try {
              body = response.body = JSON.parse(response.body)
            } catch (error) {
              console.error(response)
              throw error
            }
            if (body.code !== 200) {
              let error = new Error(body.msg)
              error.response = response
              throw error
            }
            return response
          },
        ],
      },
    })
  }

  async register (name, password) {
    let query = querystring.stringify({
      name,
      password,
    })
    await this.got(`/register?${query}`)
    return name
  }

  async login (name, password) {
    let query = querystring.stringify({
      name,
      password,
    })
    await this.got(`/login?${query}`)
    return name
  }

  /**
   * https://zhuanlan.kanxue.com/article-469.htm
   */
  async createBill (price = '4294967296') {
    let query = querystring.stringify({
      ticket_price: price,
    })
    let { body } = await this.got(`/buy_ticket?${query}`)
    let billId = op.get(body, 'data.0.bill_id')
    return billId
  }

  async payBill (billId) {
    let query = querystring.stringify({
      bill_id: billId,
    })
    let { body } = await this.got(`/pay_ticket?${query}`)
    let ticket = op.get(body, 'data.0')
    if (!ticket) {
      throw new Error('The transaction did not generate tickets.')
    }
    return ticket
  }

  async getGifts () {
    let { body } = await this.got(`/search_ticket`)
    return body.data
  }

  async kick ({ id, ticket }) {
    let query = querystring.stringify({
      id,
      ticket,
    })
    let { body } = await this.got(`/remove_robot?${query}`)
    return body
  }
}

module.exports = Api
