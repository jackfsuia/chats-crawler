# chats-crawler

<div align="center">
    
[![GitHub Code License](https://img.shields.io/github/license/jackfsuia/Vecparser)](LICENSE)

English | [简体中文](README_zh.md)
</div>
<!-- # chats-crawler -->
Discourse chat data crawling and parsing for LLM instruction finetuning. Data include the texts, images (crucial for multimodal finetuning) and links. Will support more than Discourse-based websites soon.

## Table of Contents

- [Quick Start](#quick-start)
- [Notice](#notice)
- [Future Work](#future-work)
- [License](#license)
- [Citation](#citation)
- [Acknowledgement](#acknowledgement)
## Quick Start
Run
```bash
git clone https://github.com/jackfsuia/chats-crawler.git
```
Then install the requirements, run
```bash
npm i
```
Before crawling, please read the [Notice](#Notice). Config the target website at [config.ts](config.ts), edit the `url` and `rex` properties to match your needs, i.e., replace the two `https://discuss.pytorch.org`s there with your target [**Discourse-based**](https://github.com/discourse/discourse) website. 

To start crawling, run
```bash
npm start
```
That's all! The discourse chat data are saved at `storage/datasets/default`, and the images at `storage/datasets/imgs`.

## Notice
Make sure by yourself the crawling is **legal**, check the website's robots.txt if you're not sure. We are not responsible for any law risks and issues.

## Future Work
- Support image data auto OCR to texts, then inserted among original texts data. It makes the data complete in text form, and save some space too if OCR happens when on the crawling, not post crawling.
  
## License

chats-crawler is licensed under the Apache 2.0 License found in the [LICENSE](LICENSE) file in the root directory of this repository.

## Citation

If this work is helpful, please kindly cite as:

```bibtex
@article{chats-crawler,
  title={chats-crawler: discourse chat data crawling and parsing for LLM instruction finetuning.}, 
  author={Yannan Luo},
  year={2024},
  url={https://github.com/jackfsuia/chats-crawler}
}
```
## Acknowledgement

Learned a lot from [gpt-crawler](https://github.com/BuilderIO/gpt-crawler) and [crawlee](https://github.com/apify/crawlee). Thanks for their wonderful works.
